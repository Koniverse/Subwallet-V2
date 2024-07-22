// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { AccountExternalError, AccountExternalErrorCode, AccountRefMap, RequestAccountCreateExternalV2, RequestAccountCreateHardwareMultiple, RequestAccountCreateHardwareV2, RequestAccountCreateSuriV2, RequestAccountCreateWithSecretKey, ResponseAccountCreateSuriV2, ResponseAccountCreateWithSecretKey } from '@subwallet/extension-base/background/KoniTypes';
import { ALL_ACCOUNT_KEY } from '@subwallet/extension-base/constants';
import { _getEvmChainId, _getSubstrateGenesisHash } from '@subwallet/extension-base/services/chain-service/utils';
import { KeyringService } from '@subwallet/extension-base/services/keyring-service/index';
import { CurrentAccountStore } from '@subwallet/extension-base/stores';
import AccountProxyStore from '@subwallet/extension-base/stores/AccountProxyStore';
import AccountRefStore from '@subwallet/extension-base/stores/AccountRef';
import ModifyPairStore from '@subwallet/extension-base/stores/ModifyPairStore';
import { AccountJson, AccountProxyData, AccountProxyMap, AccountProxyStoreData, CurrentAccountInfo, ModifyPairStoreData } from '@subwallet/extension-base/types';
import { isAddressValidWithAuthType, transformAccount } from '@subwallet/extension-base/utils';
import { InjectedAccountWithMeta } from '@subwallet/extension-inject/types';
import { KeyringPair, KeyringPair$Meta } from '@subwallet/keyring/types';
import { keyring } from '@subwallet/ui-keyring';
import { SubjectInfo } from '@subwallet/ui-keyring/observable/types';
import { t } from 'i18next';
import { BehaviorSubject, combineLatest } from 'rxjs';

import { hexStripPrefix, hexToU8a, isHex, stringShorten } from '@polkadot/util';
import { keyExtractSuri, mnemonicToEntropy } from '@polkadot/util-crypto';
import { KeypairType } from '@polkadot/util-crypto/types';

const ETH_DERIVE_DEFAULT = '/m/44\'/60\'/0\'/0/0';

const getSuri = (seed: string, type?: KeypairType): string => type === 'ethereum'
  ? `${seed}${ETH_DERIVE_DEFAULT}`
  : seed;

const CURRENT_ACCOUNT_KEY = 'CurrentAccountInfo';
const MODIFY_PAIRS_KEY = 'ModifyPairs';
const ACCOUNT_PROXIES_KEY = 'AccountProxies';

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
      const result: AccountProxyMap = {};

      for (const [address, pair] of Object.entries(pairs)) {
        const modifyPair = modifyPairs[address];
        const account: AccountJson = transformAccount(pair);

        if (modifyPair && modifyPair.applied && modifyPair.accountProxyId) {
          const accountGroup = accountGroups[modifyPair.accountProxyId];

          if (accountGroup) {
            if (!result[accountGroup.id]) {
              result[accountGroup.id] = { ...accountGroup, accounts: [] };
            }

            result[accountGroup.id].accounts.push(account);
            continue;
          }
        }

        result[address] = { id: address, name: account.name || account.address, accounts: [account] };
      }

      this.accountProxiesSubject.next(result);
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

  private _addAddressToAuthList (address: string, isAllowed: boolean): void {
    this.parent.state.getAuthorize((value) => {
      if (value && Object.keys(value).length) {
        Object.keys(value).forEach((url) => {
          if (isAddressValidWithAuthType(address, value[url].accountAuthType)) {
            value[url].isAllowedMap[address] = isAllowed;
          }
        });

        this.parent.state.setAuthorize(value);
      }
    });
  }

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

  // private createAccountGroupId (_suri: string) {
  //   bcrypt.
  // }

  /* Account group */

  /* Add accounts from seed */
  public async accountsCreateSuriV2 (request: RequestAccountCreateSuriV2): Promise<ResponseAccountCreateSuriV2> {
    const { genesisHash, isAllowed, name, password, suri: _suri, types } = request;
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

    // const currentAccount = this.#koniState.keyringService.context.currentAccount;
    // const allGenesisHash = currentAccount?.allGenesisHash || undefined;

    const entropy = mnemonicToEntropy(_suri);

    types?.forEach((type) => {
      const suri = getSuri(_suri, type);
      const address = keyring.createFromUri(suri, {}, type).address;

      addressDict[type] = address;
      const newAccountName = type === 'ethereum' ? `${name} - EVM` : name;

      keyring.addUri(suri, { genesisHash, name: newAccountName }, type);
      this._addAddressToAuthList(address, isAllowed);

      if (!changedAccount) {
        if (types.length === 1) {
          this.setCurrentAccount({ address });
        } else {
          this._setCurrentAccount({ address: ALL_ACCOUNT_KEY }, undefined, true);
        }

        changedAccount = true;
      }
    });

    await new Promise<void>((resolve) => {
      this.addAccountRef(Object.values(addressDict), () => {
        resolve();
      });
    });

    return addressDict;
  }

  /* Add QR-signer, read-only */
  public async accountsCreateExternalV2 (request: RequestAccountCreateExternalV2): Promise<AccountExternalError[]> {
    const { address, genesisHash, isAllowed, isEthereum, isReadOnly, name } = request;

    try {
      let result: KeyringPair;

      try {
        const exists = keyring.getPair(address);

        if (exists) {
          if (exists.type === (isEthereum ? 'ethereum' : 'sr25519')) {
            return [{ code: AccountExternalErrorCode.INVALID_ADDRESS, message: t('Account exists') }];
          }
        }
      } catch (e) {

      }

      if (isEthereum) {
        const chainInfoMap = this.parent.state.getChainInfoMap();
        let _gen = '';

        if (genesisHash) {
          for (const network of Object.values(chainInfoMap)) {
            if (_getEvmChainId(network) === parseInt(genesisHash)) {
              // TODO: pure EVM chains do not have genesisHash
              _gen = _getSubstrateGenesisHash(network);
            }
          }
        }

        result = keyring.keyring.addFromAddress(address, {
          name,
          isExternal: true,
          isReadOnly,
          genesisHash: _gen
        }, null, 'ethereum');

        keyring.saveAccount(result);
      } else {
        result = keyring.addExternal(address, { genesisHash, name, isReadOnly }).pair;
      }

      const _address = result.address;

      await new Promise<void>((resolve) => {
        this.parent.state.addAccountRef([_address], () => {
          resolve();
        });
      });

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

    await new Promise<void>((resolve) => {
      this.addAccountRef([_address], () => {
        resolve();
      });
    });

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

      addresses.push(_address);

      await new Promise<void>((resolve) => {
        this._addAddressToAuthList(_address, true);
        resolve();
      });
    }

    // const currentAccount = this.#koniState.keyringService.context.currentAccount;
    // const allGenesisHash = currentAccount?.allGenesisHash || undefined;

    if (addresses.length <= 1) {
      this._setCurrentAccount({ address: addresses[0] });
    } else {
      this._setCurrentAccount({ address: ALL_ACCOUNT_KEY });
    }

    await new Promise<void>((resolve) => {
      this.addAccountRef(addresses, () => {
        resolve();
      });
    });

    if (Object.keys(slugMap).length) {
      for (const chainSlug of Object.keys(slugMap)) {
        this.parent.state.enableChain(chainSlug, true).catch(console.error);
      }
    }

    return true;
  }

  /* Ledger */

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

      await new Promise<void>((resolve) => {
        this.addAccountRef([_address], () => {
          resolve();
        });
      });

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
