// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { AccountExternalError, AccountExternalErrorCode, AccountRefMap, RequestAccountCreateExternalV2, RequestAccountCreateHardwareMultiple, RequestAccountCreateHardwareV2, RequestAccountCreateWithSecretKey, RequestBatchRestoreV2, RequestJsonRestoreV2, ResponseAccountCreateWithSecretKey } from '@subwallet/extension-base/background/KoniTypes';
import { ALL_ACCOUNT_KEY } from '@subwallet/extension-base/constants';
import { SEED_DEFAULT_LENGTH, SEED_LENGTHS } from '@subwallet/extension-base/koni/background/handlers/Extension';
import { KeyringService } from '@subwallet/extension-base/services/keyring-service/index';
import { AccountProxyStore, AccountRefStore, CurrentAccountStore, ModifyPairStore } from '@subwallet/extension-base/stores';
import { AccountJson, AccountProxy, AccountProxyData, AccountProxyMap, AccountProxyStoreData, AccountProxyType, CreateDeriveAccountInfo, CurrentAccountInfo, DeriveAccountInfo, MnemonicType, ModifyPairStoreData, RequestAccountCreateSuriV2, RequestDeriveAccountProxy, RequestDeriveCreateMultiple, RequestDeriveCreateV3, RequestDeriveValidateV2, RequestExportAccountProxyMnemonic, RequestGetDeriveAccounts, RequestMnemonicCreateV2, RequestMnemonicValidateV2, RequestPrivateKeyValidateV2, ResponseAccountCreateSuriV2, ResponseDeriveValidateV2, ResponseExportAccountProxyMnemonic, ResponseGetDeriveAccounts, ResponseMnemonicCreateV2, ResponseMnemonicValidateV2, ResponsePrivateKeyValidateV2 } from '@subwallet/extension-base/types';
import { RequestAccountProxyEdit, RequestAccountProxyForget } from '@subwallet/extension-base/types/account/action/edit';
import { isAddressValidWithAuthType, modifyAccountName, singleAddressToAccount } from '@subwallet/extension-base/utils';
import { InjectedAccountWithMeta } from '@subwallet/extension-inject/types';
import { createPair, getDerivePath, getKeypairTypeByAddress } from '@subwallet/keyring';
import { BitcoinKeypairTypes, KeypairType, KeyringPair, KeyringPair$Json, KeyringPair$Meta, TonKeypairTypes } from '@subwallet/keyring/types';
import { tonMnemonicValidate } from '@subwallet/keyring/utils';
import { keyring } from '@subwallet/ui-keyring';
import { SubjectInfo } from '@subwallet/ui-keyring/observable/types';
import { t } from 'i18next';
import { BehaviorSubject, combineLatest } from 'rxjs';

import { assert, hexStripPrefix, hexToU8a, isHex, stringShorten, u8aToHex, u8aToString } from '@polkadot/util';
import { base64Decode, blake2AsHex, jsonDecrypt, keyExtractSuri, mnemonicGenerate, mnemonicToEntropy, mnemonicValidate } from '@polkadot/util-crypto';
import { validateMnemonic } from '@polkadot/util-crypto/mnemonic/bip39';
import { EncryptedJson, Prefix } from '@polkadot/util-crypto/types';

function getSuri (seed: string, type?: KeypairType): string {
  const extraPath = type ? getDerivePath(type)(0) : '';

  return seed + (extraPath ? '/' + extraPath : '');
}

const CURRENT_ACCOUNT_KEY = 'CurrentAccountInfo';
const MODIFY_PAIRS_KEY = 'ModifyPairs';
const ACCOUNT_PROXIES_KEY = 'AccountProxies';

/**
 * @class AccountContext
 * @note Can convert multiple states into one state and split functions into related handlers
 * */
export class AccountContext {
  // Current account
  private readonly currentAccountStore = new CurrentAccountStore();
  public readonly currentAccountSubject = new BehaviorSubject<CurrentAccountInfo>({ address: '' });

  // Account groups
  private readonly accountProxiesStore = new AccountProxyStore();
  public readonly accountProxiesSubject = new BehaviorSubject<AccountProxyStoreData>({});

  // Modify pairs
  private readonly modifyPairsStore = new ModifyPairStore();
  public readonly modifyPairsSubject = new BehaviorSubject<ModifyPairStoreData>({});

  // Observable of accounts, pairs and contacts
  public readonly contactSubject = keyring.addresses.subject;
  public readonly pairSubject = keyring.accounts.subject;
  public readonly accountSubject = new BehaviorSubject<AccountProxyMap>({});

  // Old from Polkadot-js
  private readonly accountRefStore = new AccountRefStore();

  // Save before account info to check if accounts changed (injected accounts)
  private beforeAccount: SubjectInfo = this.pairSubject.value;

  private injected: boolean;

  constructor (private parent: KeyringService) {
    this.injected = false;

    this.parent.state.eventService.waitCryptoReady
      .then(() => {
        // Load current account
        this.currentAccountStore.get(CURRENT_ACCOUNT_KEY, (rs) => {
          rs && this.currentAccountSubject.next(rs);
        });
        // Load modify pairs
        this.modifyPairsStore.get(MODIFY_PAIRS_KEY, (rs) => {
          rs && this.modifyPairsSubject.next(rs);
        });
        // Load account proxies
        this.accountProxiesStore.get(ACCOUNT_PROXIES_KEY, (rs) => {
          rs && this.accountProxiesSubject.next(rs);
        });
        this.subscribeAccounts().catch(console.error);
      })
      .catch(console.error);
  }

  private async subscribeAccounts () {
    // Wait until account ready
    await this.parent.state.eventService.waitAccountReady;
    this.beforeAccount = { ...this.pairSubject.value };
    this.pairSubject.subscribe((subjectInfo) => {
      // Check if accounts changed
      const beforeAddresses = Object.keys(this.beforeAccount);
      const afterAddresses = Object.keys(subjectInfo);

      if (beforeAddresses.length > afterAddresses.length) {
        const removedAddresses = beforeAddresses.filter((address) => !afterAddresses.includes(address));

        // Remove account
        removedAddresses.forEach((address) => {
          this.parent.state.eventService.emit('account.remove', address);
        });
      } else if (beforeAddresses.length < afterAddresses.length) {
        const addedAddresses = afterAddresses.filter((address) => !beforeAddresses.includes(address));

        // Add account
        addedAddresses.forEach((address) => {
          this.parent.state.eventService.emit('account.add', address);
        });
      } else {
        // Handle case update later
      }

      this.beforeAccount = { ...subjectInfo };
    });

    const pairs = this.pairSubject.asObservable();
    const modifyPairs = this.modifyPairsSubject.asObservable();
    const accountGroups = this.accountProxiesSubject.asObservable();

    combineLatest([pairs, modifyPairs, accountGroups]).subscribe(([pairs, modifyPairs, accountGroups]) => {
      const temp: Record<string, Omit<AccountProxy, 'accountType'>> = {};

      for (const [address, pair] of Object.entries(pairs)) {
        const modifyPair = modifyPairs[address];
        const account: AccountJson = singleAddressToAccount(pair);

        if (modifyPair && modifyPair.accountProxyId) {
          const accountGroup = accountGroups[modifyPair.accountProxyId];

          if (accountGroup) {
            if (!temp[accountGroup.id]) {
              temp[accountGroup.id] = { ...accountGroup, accounts: [] };
            }

            temp[accountGroup.id].accounts.push(account);
            continue;
          }
        }

        temp[address] = { id: address, name: account.name || account.address, accounts: [account] };
      }

      const result: AccountProxyMap = Object.fromEntries(
        Object.entries(temp)
          .map(([key, value]): [string, AccountProxy] => {
            let accountType: AccountProxyType = AccountProxyType.UNKNOWN;

            if (value.accounts.length > 1) {
              accountType = AccountProxyType.MULTI;
            } else if (value.accounts.length === 1) {
              const account = value.accounts[0];

              if (account.isInjected) {
                accountType = AccountProxyType.INJECTED;
              } else if (account.isExternal) {
                if (account.isHardware) {
                  accountType = AccountProxyType.LEDGER;
                } else if (account.isReadOnly) {
                  accountType = AccountProxyType.READ_ONLY;
                } else {
                  accountType = AccountProxyType.QR;
                }
              } else {
                accountType = AccountProxyType.SINGLE;
              }
            }

            return [key, { ...value, accountType }];
          })
      );

      this.accountSubject.next(result);
    });
  }

  get pairs (): SubjectInfo {
    return this.pairSubject.value;
  }

  get contacts (): SubjectInfo {
    return this.contactSubject.value;
  }

  get accounts (): AccountProxyMap {
    return this.accountSubject.value;
  }

  /* Current account */

  get currentAccount (): CurrentAccountInfo {
    return this.currentAccountSubject.value;
  }

  setCurrentAccount (currentAccountData: CurrentAccountInfo) {
    this.currentAccountSubject.next(currentAccountData);
    this.parent.state.eventService.emit('account.updateCurrent', currentAccountData);
    this.currentAccountStore.set(CURRENT_ACCOUNT_KEY, currentAccountData);
  }

  public _setCurrentAccount (data: CurrentAccountInfo, callback?: () => void, preventOneAccount?: boolean): void {
    const { address } = data;
    const result: CurrentAccountInfo = { ...data };

    if (address === ALL_ACCOUNT_KEY) {
      const pairs = keyring.getAccounts();
      const pair = pairs[0];

      if (pairs.length > 1 || !pair) {
        // Empty
      } else {
        if (!preventOneAccount) {
          result.address = pair.address;
        }
      }
    }

    this.setCurrentAccount(result);
    callback && callback();
  }

  private _saveCurrentAccountAddress (address: string, callback?: (data: CurrentAccountInfo) => void) {
    let accountInfo = this.currentAccount;

    if (!accountInfo) {
      accountInfo = {
        address
      };
    } else {
      accountInfo.address = address;
    }

    this._setCurrentAccount(accountInfo, () => {
      callback && callback(accountInfo);
    });
  }

  /* Current account */

  /* Auth address */

  private _addAddressesToAuthList (addresses: string[], isAllowed: boolean): void {
    this.parent.state.getAuthorize((value) => {
      if (value && Object.keys(value).length) {
        Object.keys(value).forEach((url) => {
          addresses.forEach((address) => {
            if (isAddressValidWithAuthType(address, value[url].accountAuthType)) {
              value[url].isAllowedMap[address] = isAllowed;
            }
          });
        });

        this.parent.state.setAuthorize(value);
      }
    });
  }

  private _addAddressToAuthList (address: string, isAllowed: boolean): void {
    this._addAddressesToAuthList([address], isAllowed);
  }

  /* Auth address */

  /* Account groups */

  /* Upsert account group */
  private upsertAccountProxy (data: AccountProxyData, callback?: () => void) {
    this.accountProxiesStore.get(ACCOUNT_PROXIES_KEY, (rs) => {
      const accountGroups = rs || {};

      accountGroups[data.id] = data;
      this.accountProxiesSubject.next(accountGroups);
      this.accountProxiesStore.set(ACCOUNT_PROXIES_KEY, accountGroups, callback);
    });
  }

  /* Delete account group */
  private deleteAccountProxy (key: string, callback?: () => void) {
    this.accountProxiesStore.get(ACCOUNT_PROXIES_KEY, (rs) => {
      const accountGroups = rs || {};

      delete accountGroups[key];
      this.accountProxiesSubject.next(accountGroups);
      this.accountProxiesStore.set(ACCOUNT_PROXIES_KEY, accountGroups, callback);
    });
  }

  /* Create group id */
  private createAccountGroupId (_suri: string, derivationPath?: string) {
    let data: string = _suri;

    if (validateMnemonic(_suri)) {
      const entropy = mnemonicToEntropy(_suri);

      data = u8aToHex(entropy);

      if (derivationPath) {
        data = blake2AsHex(data, 256);
      }
    }

    if (derivationPath) {
      data = hexStripPrefix(data).concat(derivationPath);
    }

    return blake2AsHex(data, 256);
  }

  /* Account group */

  /* Modify pairs */

  /* Upsert modify pairs */
  private upsertModifyPairs (data: ModifyPairStoreData) {
    this.modifyPairsStore.set(MODIFY_PAIRS_KEY, data);
    this.modifyPairsSubject.next(data);
  }

  /* Modify pairs */

  /* Modify accounts */

  public accountsEdit ({ name, proxyId }: RequestAccountProxyEdit): boolean {
    const accountProxies = this.accountProxiesSubject.value;
    const modifyPairs = this.modifyPairsSubject.value;

    if (!accountProxies[proxyId]) {
      const pair = keyring.getPair(proxyId);

      assert(pair, t('Unable to find account'));

      keyring.saveAccountMeta(pair, { ...pair.meta, name });
    } else {
      const accountGroup = accountProxies[proxyId];
      const addresses = Object.keys(modifyPairs).filter((address) => modifyPairs[address].accountProxyId === proxyId);

      accountGroup.name = name;
      this.upsertAccountProxy(accountGroup);

      for (const address of addresses) {
        const pair = keyring.getPair(address);

        assert(pair, t('Unable to find account'));

        const _name = modifyAccountName(pair.type, name, true);

        keyring.saveAccountMeta(pair, { ...pair.meta, name: _name });
      }
    }

    return true;
  }

  public async accountProxyForget ({ proxyId }: RequestAccountProxyForget): Promise<string[]> {
    const accountProxies = this.accountProxiesSubject.value;
    const modifyPairs = this.modifyPairsSubject.value;

    let addresses: string[];

    if (!accountProxies[proxyId]) {
      addresses = [proxyId];
    } else {
      addresses = Object.keys(modifyPairs).filter((address) => modifyPairs[address].accountProxyId === proxyId);

      this.deleteAccountProxy(proxyId);
    }

    for (const address of addresses) {
      delete modifyPairs[address];
    }

    this.upsertModifyPairs(modifyPairs);

    for (const address of addresses) {
      keyring.forgetAccount(address);
    }

    await Promise.all(addresses.map((address) => new Promise<void>((resolve) => this.removeAccountRef(address, resolve))));

    await new Promise<void>((resolve) => {
      this._setCurrentAccount({ address: ALL_ACCOUNT_KEY }, resolve);
    });

    return addresses;
  }

  /* Modify accounts */

  /* Create with mnemonic */

  /* Create seed */
  public mnemonicCreateV2 ({ length = SEED_DEFAULT_LENGTH, mnemonic: _seed, type = 'general' }: RequestMnemonicCreateV2): ResponseMnemonicCreateV2 {
    const seed = _seed || mnemonicGenerate(length);
    // At this point, only 'general' type will be accepted
    const types: KeypairType[] = type === 'general' ? ['sr25519', 'ethereum', 'ton'] : ['ton-special'];
    const rs = { mnemonic: seed, addressMap: {} } as ResponseMnemonicCreateV2;

    types?.forEach((type) => {
      rs.addressMap[type] = keyring.createFromUri(getSuri(seed, type), {}, type).address;
    });

    return rs;
  }

  /* Validate seed */
  public mnemonicValidateV2 ({ mnemonic }: RequestMnemonicValidateV2): ResponseMnemonicValidateV2 {
    const { phrase } = keyExtractSuri(mnemonic);
    let mnemonicTypes: MnemonicType = 'general';
    let pairTypes: KeypairType[] = [];

    if (isHex(phrase)) {
      assert(isHex(phrase, 256), t('Invalid seed phrase. Please try again.'));
    } else {
      // sadly isHex detects as string, so we need a cast here
      assert(SEED_LENGTHS.includes((phrase).split(' ').length), t('Seed phrase needs to contain {{x}} words', { replace: { x: SEED_LENGTHS.join(', ') } }));

      try {
        assert(mnemonicValidate(phrase), t('Invalid seed phrase. Please try again.'));

        mnemonicTypes = 'general';
        pairTypes = ['sr25519', 'ethereum', 'ton'];
      } catch (e) {
        assert(tonMnemonicValidate(phrase), t('Invalid seed phrase. Please try again.'));
        mnemonicTypes = 'ton';
        pairTypes = ['ton-special'];
      }
    }

    const rs: ResponseMnemonicValidateV2 = {
      mnemonic,
      addressMap: {} as Record<KeypairType, string>,
      mnemonicTypes,
      pairTypes
    };

    pairTypes.forEach((type) => {
      rs.addressMap[type] = keyring.createFromUri(getSuri(mnemonic, type), {}, type).address;
    });

    return rs;
  }

  /* Add accounts from mnemonic */
  public accountsCreateSuriV2 (request: RequestAccountCreateSuriV2): ResponseAccountCreateSuriV2 {
    const { isAllowed, name, password, suri: _suri, types } = request;
    const addressDict = {} as Record<KeypairType, string>;
    let changedAccount = false;
    const hasMasterPassword = keyring.keyring.hasMasterPassword;

    if (!hasMasterPassword) {
      if (!password) {
        throw Error(t('The password of each account is needed to set up master password'));
      } else {
        keyring.changeMasterPassword(password);
        this.parent.updateKeyringState();
      }
    }

    if (!types || !types.length) {
      throw Error(t('Please choose at least one account type'));
    }

    // const currentAccount = this.#koniState.keyringService.context.currentAccount;
    // const allGenesisHash = currentAccount?.allGenesisHash || undefined;

    const multiChain = types.length > 1;
    const proxyId = multiChain ? this.createAccountGroupId(_suri) : '';

    // Upsert account group first, to avoid combine latest have no account group data.
    if (proxyId) {
      this.upsertAccountProxy({ id: proxyId, name });
    }

    const modifiedPairs = this.modifyPairsSubject.value;

    types.forEach((type) => {
      const suri = getSuri(_suri, type);
      const pair = keyring.createFromUri(suri, {}, type);
      const address = pair.address;

      modifiedPairs[address] = { accountProxyId: proxyId || address, migrated: true, key: address };
      addressDict[type] = address;
    });

    // Upsert modify pair before add account to keyring
    this.upsertModifyPairs(modifiedPairs);

    types.forEach((type) => {
      const suri = getSuri(_suri, type);
      const newAccountName = modifyAccountName(type, name, !!proxyId);
      const rs = keyring.addUri(suri, { name: newAccountName }, type);
      const address = rs.pair.address;

      this._addAddressToAuthList(address, isAllowed);

      if (!changedAccount) {
        if (!proxyId) {
          this.setCurrentAccount({ address });
        } else {
          this._setCurrentAccount({ address: proxyId }, undefined, true);
        }

        changedAccount = true;
      }
    });

    return addressDict;
  }

  /* Create with mnemonic */

  /* Add QR-signer, read-only */
  public async accountsCreateExternalV2 (request: RequestAccountCreateExternalV2): Promise<AccountExternalError[]> {
    const { address, isAllowed, isReadOnly, name } = request;
    const type = getKeypairTypeByAddress(address);

    try {
      try {
        const exists = keyring.getPair(address);

        if (exists) {
          if (exists.type === type) {
            return [{ code: AccountExternalErrorCode.INVALID_ADDRESS, message: t('Account exists') }];
          }
        }
      } catch (e) {

      }

      const meta: KeyringPair$Meta = {
        name,
        isExternal: true,
        isReadOnly,
        genesisHash: ''
      };

      if ([...BitcoinKeypairTypes, ...TonKeypairTypes].includes(type)) {
        meta.noPublicKey = true;
      }

      const result = keyring.keyring.addFromAddress(address, meta, null, type);

      keyring.saveAccount(result);

      const _address = result.address;
      const modifiedPairs = this.modifyPairsSubject.value;

      modifiedPairs[_address] = { migrated: true, key: _address };

      this.upsertModifyPairs(modifiedPairs);

      await new Promise<void>((resolve) => {
        this._saveCurrentAccountAddress(_address, () => {
          this._addAddressToAuthList(_address, isAllowed);
          resolve();
        });
      });

      return [];
    } catch (e) {
      return [{ code: AccountExternalErrorCode.KEYRING_ERROR, message: (e as Error).message }];
    }
  }

  /* Import ethereum account with the private key  */
  public _checkValidatePrivateKey ({ privateKey }: RequestPrivateKeyValidateV2, autoAddPrefix = false): ResponsePrivateKeyValidateV2 {
    const { phrase } = keyExtractSuri(privateKey);
    const rs = { autoAddPrefix: autoAddPrefix, addressMap: {} } as ResponsePrivateKeyValidateV2;
    const types: KeypairType[] = ['ethereum'];

    types.forEach((type) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      rs.addressMap[type] = '';
    });

    if (isHex(phrase) && isHex(phrase, 256)) {
      types && types.forEach((type) => {
        rs.addressMap[type] = keyring.createFromUri(getSuri(privateKey, type), {}, type).address;
      });
    } else {
      rs.autoAddPrefix = false;
      assert(false, t('Invalid private key. Please try again.'));
    }

    return rs;
  }

  public metamaskPrivateKeyValidateV2 ({ privateKey }: RequestPrivateKeyValidateV2): ResponsePrivateKeyValidateV2 {
    const isHex = privateKey.startsWith('0x');

    if (isHex) {
      return this._checkValidatePrivateKey({ privateKey });
    } else {
      return this._checkValidatePrivateKey({ privateKey: `0x${privateKey}` }, true);
    }
  }
  /* Import ethereum account with the private key  */

  /* Ledger */

  /* For custom derive path */
  public async accountsCreateHardwareV2 (request: RequestAccountCreateHardwareV2): Promise<boolean> {
    const { accountIndex, address, addressOffset, genesisHash, hardwareType, isAllowed, name } = request;
    const key = keyring.addHardware(address, hardwareType, {
      accountIndex,
      addressOffset,
      genesisHash,
      name,
      originGenesisHash: genesisHash
    });

    const result = key.pair;

    const _address = result.address;
    const modifiedPairs = this.modifyPairsSubject.value;

    modifiedPairs[_address] = { migrated: true, key: _address };

    this.upsertModifyPairs(modifiedPairs);

    await new Promise<void>((resolve) => {
      this._saveCurrentAccountAddress(_address, () => {
        this._addAddressToAuthList(_address, isAllowed || false);
        resolve();
      });
    });

    return true;
  }

  /* For multi select */
  public async accountsCreateHardwareMultiple ({ accounts }: RequestAccountCreateHardwareMultiple): Promise<boolean> {
    const addresses: string[] = [];

    if (!accounts.length) {
      throw new Error(t("Can't find an account. Please try again"));
    }

    const slugMap: Record<string, string> = {};
    const modifiedPairs = this.modifyPairsSubject.value;

    for (const account of accounts) {
      const { accountIndex, address, addressOffset, genesisHash, hardwareType, isEthereum, isGeneric, name } = account;

      let result: KeyringPair;

      const baseMeta: KeyringPair$Meta = {
        name,
        hardwareType,
        accountIndex,
        addressOffset,
        genesisHash,
        originGenesisHash: genesisHash,
        isGeneric
      };

      if (isEthereum) {
        result = keyring.keyring.addFromAddress(address, {
          ...baseMeta,
          isExternal: true,
          isHardware: true
        }, null, 'ethereum');

        keyring.saveAccount(result);
        slugMap.ethereum = 'ethereum';
      } else {
        result = keyring.addHardware(address, hardwareType, {
          ...baseMeta,
          availableGenesisHashes: [genesisHash]
        }).pair;

        const [slug] = this.parent.state.findNetworkKeyByGenesisHash(genesisHash);

        if (slug) {
          slugMap[slug] = slug;
        }
      }

      const _address = result.address;

      modifiedPairs[_address] = { migrated: true, key: _address };
      addresses.push(_address);

      await new Promise<void>((resolve) => {
        this._addAddressToAuthList(_address, true);
        resolve();
      });
    }

    // const currentAccount = this.#koniState.keyringService.context.currentAccount;
    // const allGenesisHash = currentAccount?.allGenesisHash || undefined;

    this.upsertModifyPairs(modifiedPairs);

    if (addresses.length <= 1) {
      this._setCurrentAccount({ address: addresses[0] });
    } else {
      this._setCurrentAccount({ address: ALL_ACCOUNT_KEY });
    }

    if (Object.keys(slugMap).length) {
      for (const chainSlug of Object.keys(slugMap)) {
        this.parent.state.enableChain(chainSlug, true).catch(console.error);
      }
    }

    return true;
  }

  /* Ledger */

  /* JSON */

  public decodeAddress = (key: string | Uint8Array, ignoreChecksum?: boolean, ss58Format?: Prefix): Uint8Array => {
    return keyring.decodeAddress(key, ignoreChecksum, ss58Format);
  };

  public encodeAddress = (key: string | Uint8Array, ss58Format?: Prefix): string => {
    return keyring.encodeAddress(key, ss58Format);
  };

  private validatePassword (json: KeyringPair$Json, password: string): boolean {
    const cryptoType = Array.isArray(json.encoding.content) ? json.encoding.content[1] : 'ed25519';
    const encType = Array.isArray(json.encoding.type) ? json.encoding.type : [json.encoding.type];
    const pair = createPair(
      { toSS58: this.encodeAddress, type: cryptoType as KeypairType },
      { publicKey: this.decodeAddress(json.address, true) },
      json.meta,
      isHex(json.encoded) ? hexToU8a(json.encoded) : base64Decode(json.encoded),
      encType
    );

    // unlock then lock (locking cleans secretKey, so needs to be last)
    try {
      pair.decodePkcs8(password);
      pair.lock();

      return true;
    } catch (e) {
      console.error(e);

      return false;
    }
  }

  public jsonRestoreV2 ({ address, file, isAllowed, password, withMasterPassword }: RequestJsonRestoreV2): void {
    const isPasswordValidated = this.validatePassword(file, password);

    if (isPasswordValidated) {
      try {
        this._saveCurrentAccountAddress(address, () => {
          const newAccount = keyring.restoreAccount(file, password, withMasterPassword);

          // genesisHash is not used in SubWallet => reset it to empty string, if it is not hardware wallet
          if (!newAccount.meta?.isHardware && newAccount.meta?.genesisHash !== '') {
            keyring.saveAccountMeta(newAccount, { ...newAccount.meta, genesisHash: '' });
          }

          this._addAddressToAuthList(address, isAllowed);
        });
      } catch (error) {
        throw new Error((error as Error).message);
      }
    } else {
      throw new Error(t('Wrong password'));
    }
  }

  private validatedAccountsPassword (json: EncryptedJson, password: string): boolean {
    try {
      u8aToString(jsonDecrypt(json, password));

      return true;
    } catch (e) {
      return false;
    }
  }

  public batchRestoreV2 ({ accountsInfo, file, isAllowed, password }: RequestBatchRestoreV2): void {
    const addressList: string[] = accountsInfo.map((acc) => acc.address);
    const isPasswordValidated = this.validatedAccountsPassword(file, password);

    if (isPasswordValidated) {
      try {
        this._saveCurrentAccountAddress(ALL_ACCOUNT_KEY, () => {
          keyring.restoreAccounts(file, password);

          this.removeNoneHardwareGenesisHash();
          this._addAddressesToAuthList(addressList, isAllowed);
        });
      } catch (error) {
        throw new Error((error as Error).message);
      }
    } else {
      throw new Error(t('Wrong password'));
    }
  }

  /* JSON */

  /* Add with secret and public key */
  public async accountsCreateWithSecret (request: RequestAccountCreateWithSecretKey): Promise<ResponseAccountCreateWithSecretKey> {
    const { isAllow, isEthereum, name, publicKey, secretKey } = request;

    try {
      let keyringPair: KeyringPair | null = null;

      if (isEthereum) {
        const _secret = hexStripPrefix(secretKey);

        if (_secret.length === 64) {
          const suri = `0x${_secret}`;
          const { phrase } = keyExtractSuri(suri);

          if (isHex(phrase) && isHex(phrase, 256)) {
            const type: KeypairType = 'ethereum';

            keyringPair = keyring.addUri(getSuri(suri, type), { name: name }, type).pair;
          }
        }
      } else {
        keyringPair = keyring.keyring.addFromPair({
          publicKey: hexToU8a(publicKey),
          secretKey: hexToU8a(secretKey)
        }, { name });
        keyring.addPair(keyringPair, true);
      }

      if (!keyringPair) {
        return {
          success: false,
          errors: [{ code: AccountExternalErrorCode.KEYRING_ERROR, message: t('Cannot create account') }]
        };
      }

      const _address = keyringPair.address;
      const modifiedPairs = this.modifyPairsSubject.value;

      modifiedPairs[_address] = { migrated: true, key: _address };

      this.upsertModifyPairs(modifiedPairs);

      await new Promise<void>((resolve) => {
        this._saveCurrentAccountAddress(_address, () => {
          this._addAddressToAuthList(_address, isAllow);
          resolve();
        });
      });

      return {
        errors: [],
        success: true
      };
    } catch (e) {
      return {
        success: false,
        errors: [{ code: AccountExternalErrorCode.KEYRING_ERROR, message: (e as Error).message }]
      };
    }
  }

  /* Derive */

  /* Derive multi account */
  public derivationCreateMultiple ({ isAllowed, items, parentAddress }: RequestDeriveCreateMultiple): boolean {
    const parentPair = keyring.getPair(parentAddress);
    const isEvm = parentPair.type === 'ethereum';

    if (parentPair.isLocked) {
      keyring.unlockPair(parentPair.address);
    }

    const createChild = ({ name, suri }: CreateDeriveAccountInfo): KeyringPair => {
      const meta: KeyringPair$Meta = {
        name: name,
        parentAddress
      };

      if (isEvm) {
        let index = 0;

        try {
          const reg = /^\d+$/;
          const path = suri.split('//')[1];

          if (reg.test(path)) {
            index = parseInt(path);
          }
        } catch (e) {

        }

        if (!index) {
          throw Error(t('Invalid derive path'));
        }

        meta.suri = `//${index}`;

        return parentPair.evm.derive(index, meta);
      } else {
        meta.suri = suri;

        return parentPair.substrate.derive(suri, meta);
      }
    };

    const result: KeyringPair[] = [];

    for (const item of items) {
      try {
        const childPair = createChild(item);
        const address = childPair.address;

        keyring.addPair(childPair, true);
        this._addAddressToAuthList(address, isAllowed);
        result.push(childPair);
      } catch (e) {
        console.log(e);
      }
    }

    if (result.length === 1) {
      this._saveCurrentAccountAddress(result[0].address);
    } else {
      this._setCurrentAccount({ address: ALL_ACCOUNT_KEY });
    }

    return true;
  }

  /* Auto create derive account */
  public derivationCreateV3 ({ address: parentAddress }: RequestDeriveCreateV3): boolean {
    const parentPair = keyring.getPair(parentAddress);
    const isEvm = parentPair.type === 'ethereum';

    if (parentPair.isLocked) {
      keyring.unlockPair(parentPair.address);
    }

    const pairs = keyring.getPairs();
    const children = pairs.filter((p) => p.meta.parentAddress === parentAddress);
    const name = `Account ${pairs.length}`;

    let index = isEvm ? 1 : 0;
    let valid = false;

    do {
      const exist = children.find((p) => p.meta.suri === `//${index}`);

      if (exist) {
        index++;
      } else {
        valid = true;
      }
    } while (!valid);

    const meta = {
      name,
      parentAddress,
      suri: `//${index}`
    };
    const childPair = isEvm ? parentPair.evm.derive(index, meta) : parentPair.substrate.derive(meta.suri, meta);
    const address = childPair.address;

    this._saveCurrentAccountAddress(address, () => {
      keyring.addPair(childPair, true);
      this._addAddressToAuthList(address, true);
    });

    return true;
  }

  /* Validate derivation path */
  public validateDerivePath ({ parentAddress, suri }: RequestDeriveValidateV2): ResponseDeriveValidateV2 {
    const parentPair = keyring.getPair(parentAddress);
    const isEvm = parentPair.type === 'ethereum';

    if (parentPair.isLocked) {
      keyring.unlockPair(parentPair.address);
    }

    const meta: KeyringPair$Meta = {
      parentAddress
    };

    let childPair: KeyringPair;

    if (isEvm) {
      let index = 0;

      try {
        const reg = /^\d+$/;
        const path = suri.split('//')[1];

        if (reg.test(path)) {
          index = parseInt(path);
        }
      } catch (e) {

      }

      if (!index) {
        throw Error(t('Invalid derive path'));
      }

      meta.suri = `//${index}`;

      childPair = parentPair.evm.derive(index, meta);
    } else {
      meta.suri = suri;
      childPair = parentPair.substrate.derive(suri, meta);
    }

    return {
      address: childPair.address,
      suri: meta.suri as string
    };
  }

  /* Get a derivation account list */
  public getListDeriveAccounts ({ limit, page, parentAddress }: RequestGetDeriveAccounts): ResponseGetDeriveAccounts {
    const parentPair = keyring.getPair(parentAddress);
    const isEvm = parentPair.type === 'ethereum';

    if (parentPair.isLocked) {
      keyring.unlockPair(parentPair.address);
    }

    const start = (page - 1) * limit + (isEvm ? 1 : 0);
    const end = start + limit;

    const result: DeriveAccountInfo[] = [];

    for (let i = start; i < end; i++) {
      const suri = `//${i}`;
      const pair = isEvm ? parentPair.evm.derive(i, {}) : parentPair.substrate.derive(suri, {});

      result.push({ address: pair.address, suri: suri });
    }

    return {
      result: result
    };
  }

  /**
   * Derive account proxy
   * @todo: finish this method
   *  */
  public derivationAccountProxyCreate ({ proxyId, suri }: RequestDeriveAccountProxy): boolean {
    const pairs = keyring.getPairs();

    const newProxyName = 'Account 1';
    // const modifyPairs = this.modifyPairsSubject.value;
    const accountProxies = this.accountProxiesSubject.value;

    if (!accountProxies[proxyId]) {
      const parentAddress = proxyId;
      const parentPair = keyring.getPair(parentAddress);
      const isEvm = parentPair.type === 'ethereum';

      if (!parentPair) {
        throw Error(t('Cannot find account'));
      }

      const pairs = keyring.getPairs();
      const children = pairs.filter((p) => p.meta.parentAddress === parentAddress);
      const name = `Account ${pairs.length}`;

      let index = isEvm ? 1 : 0;
      let valid = false;

      do {
        const exist = children.find((p) => p.meta.suri === `//${index}`);

        if (exist) {
          index++;
        } else {
          valid = true;
        }
      } while (!valid);

      const meta = {
        name,
        parentAddress,
        suri: `//${index}`
      };
      const childPair = isEvm ? parentPair.evm.derive(index, meta) : parentPair.substrate.derive(meta.suri, meta);
      const address = childPair.address;

      this._saveCurrentAccountAddress(address, () => {
        keyring.addPair(childPair, true);
        this._addAddressToAuthList(address, true);
      });

      return true;
    } else {
      // Empty
    }

    pairs.forEach((pair) => {
      if (pair.meta.proxyId !== proxyId) {
        return;
      }

      const isEvm = pair.type === 'ethereum';

      if (pair.isLocked) {
        keyring.unlockPair(pair.address);
      }

      const children = pairs.filter((p) => p.meta.parentAddress === pair.address);

      let index = 1;
      let valid = false;

      do {
        const exist = children.find((p) => p.meta.suri === `//${index}`);

        if (exist) {
          index++;
        } else {
          valid = true;
        }
      } while (!valid);

      const meta = {
        name: newProxyName,
        parentAddress: pair.address,
        suri: `//${index}`
      };

      // todo: will update logic if support more type
      const childPair = isEvm ? pair.evm.derive(index, meta) : pair.substrate.derive(index.toString(), meta);

      keyring.addPair(childPair, true);
    });

    return true;
  }

  /* Derive */

  /* Export */

  /* Export mnemonic */
  public exportAccountProxyMnemonic ({ password, proxyId }: RequestExportAccountProxyMnemonic): ResponseExportAccountProxyMnemonic {
    const accountProxies = this.accountProxiesSubject.value;
    const modifyPairs = this.modifyPairsSubject.value;

    if (!accountProxies[proxyId]) {
      const pair = keyring.getPair(proxyId);

      assert(pair, t('Unable to find account'));

      const result = pair.exportMnemonic(password);

      return { result };
    } else {
      const accountGroup = accountProxies[proxyId];
      const addresses = Object.keys(modifyPairs).filter((address) => modifyPairs[address].accountProxyId === proxyId);

      this.upsertAccountProxy(accountGroup);

      let pair: KeyringPair | undefined;

      for (const address of addresses) {
        pair = keyring.getPair(address);

        if (pair && pair.haveEntropy) {
          break;
        }
      }

      assert(pair, t('Unable to find account'));

      const result = pair.exportMnemonic(password) || '';

      return { result };
    }
  }

  /* Export */

  /* Inject */

  public addInjectAccounts (accounts: InjectedAccountWithMeta[]) {
    keyring.addInjects(accounts.map((account) => {
      const name = account.meta.name || stringShorten(account.address);

      // TODO: Add if need
      // name = name.concat(' (', account.meta.source, ')');

      return {
        ...account,
        meta: {
          ...account.meta,
          name: name
        }
      };
    }));

    const currentAddress = this.currentAccountSubject.value.address;
    const afterAccounts: Record<string, boolean> = {};

    Object.keys(this.pairs).forEach((adr) => {
      afterAccounts[adr] = true;
    });

    accounts.forEach((value) => {
      afterAccounts[value.address] = true;
    });

    if (Object.keys(afterAccounts).length === 1) {
      this.currentAccountSubject.next({ address: Object.keys(afterAccounts)[0] });
    } else if (Object.keys(afterAccounts).indexOf(currentAddress) === -1) {
      this.currentAccountSubject.next({ address: ALL_ACCOUNT_KEY });
    }

    if (!this.injected) {
      this.parent.state.eventService.emit('inject.ready', true);
      this.injected = true;
    }
  }

  public removeInjectAccounts (_addresses: string[]) {
    const addresses = _addresses.map((address) => {
      try {
        return keyring.getPair(address).address;
      } catch (error) {
        return address;
      }
    });
    const currentAddress = this.currentAccountSubject.value.address;
    const afterAccounts = Object.keys(this.pairs).filter((address) => (addresses.indexOf(address) < 0));

    if (afterAccounts.length === 1) {
      this.currentAccountSubject.next({ address: afterAccounts[0] });
    } else if (addresses.indexOf(currentAddress) === -1) {
      this.currentAccountSubject.next({ address: ALL_ACCOUNT_KEY });
    }

    keyring.removeInjects(addresses);
  }

  /* Inject */

  /**
   * @deprecated
   * Account ref
   * */

  /** @deprecated */
  public getAccountRefMap (callback: (refMap: Record<string, Array<string>>) => void) {
    const refMap: AccountRefMap = {};

    this.accountRefStore.get('refList', (refList) => {
      if (refList) {
        refList.forEach((accRef) => {
          accRef.forEach((acc) => {
            refMap[acc] = [...accRef].filter((r) => !(r === acc));
          });
        });
      }

      callback(refMap);
    });
  }

  /** @deprecated */
  public addAccountRef (addresses: string[], callback: () => void) {
    this.accountRefStore.get('refList', (refList) => {
      const newList = refList ? [...refList] : [];

      newList.push(addresses);

      this.accountRefStore.set('refList', newList, callback);
    });
  }

  /** @deprecated */
  public removeAccountRef (address: string, callback: () => void) {
    this.accountRefStore.get('refList', (refList) => {
      if (refList) {
        refList.forEach((accRef) => {
          if (accRef.indexOf(address) > -1) {
            accRef.splice(accRef.indexOf(address), 1);
          }

          if (accRef.length < 2) {
            refList.splice(refList.indexOf(accRef), 1);
          }
        });

        this.accountRefStore.set('refList', refList, () => {
          callback();
        });
      } else {
        callback();
      }
    });
  }

  /**
   * Account ref
   * */

  /* Others */

  removeNoneHardwareGenesisHash () {
    const pairs = keyring.getPairs();

    const needUpdatePairs = pairs.filter(({ meta: { genesisHash, isHardware } }) => !isHardware && genesisHash && genesisHash !== '');

    needUpdatePairs.forEach((pair) => {
      keyring.saveAccountMeta(pair, { ...pair.meta, genesisHash: '' });
    });
  }

  /* Others */
}
