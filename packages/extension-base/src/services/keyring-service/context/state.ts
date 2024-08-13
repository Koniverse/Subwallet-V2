// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { AccountRefMap } from '@subwallet/extension-base/background/KoniTypes';
import { ALL_ACCOUNT_KEY } from '@subwallet/extension-base/constants';
import KoniState from '@subwallet/extension-base/koni/background/handlers/State';
import { AccountProxyStoreSubject, CurrentAccountStoreSubject, ModifyPairStoreSubject } from '@subwallet/extension-base/services/keyring-service/context/stores';
import { AccountRefStore } from '@subwallet/extension-base/stores';
import { AccountMetadataData, AccountProxyData, AccountProxyMap, AccountProxyType, CurrentAccountInfo, ModifyPairStoreData } from '@subwallet/extension-base/types';
import { addLazy, combineAccounts, isAddressValidWithAuthType } from '@subwallet/extension-base/utils';
import { keyring } from '@subwallet/ui-keyring';
import { SubjectInfo } from '@subwallet/ui-keyring/observable/types';
import { BehaviorSubject, combineLatest } from 'rxjs';

export class AccountState {
  // Current account
  private readonly _currentAccount = new CurrentAccountStoreSubject();

  // Account proxies
  private readonly _accountProxy = new AccountProxyStoreSubject();

  // Modify pairs
  private readonly _modifyPair = new ModifyPairStoreSubject();

  // Observable of accounts, pairs and contacts
  private readonly contactSubject = keyring.addresses.subject;
  private readonly pairSubject = keyring.accounts.subject;
  private readonly accountSubject = new BehaviorSubject<AccountProxyMap>({});

  // Old from Polkadot-js
  private readonly accountRefStore = new AccountRefStore();

  // Save before account info to check if accounts changed (injected accounts)
  private beforeAccount: SubjectInfo = this.pairSubject.value;

  private _injected: boolean;

  constructor (private readonly koniState: KoniState) {
    this._injected = false;

    this.koniState.eventService.waitCryptoReady
      .then(() => {
        // Load current account
        this._currentAccount.init();
        // Load modify pairs
        this._modifyPair.init();
        // Load account proxies
        this._accountProxy.init();
        this.subscribeAccounts().catch(console.error);
      })
      .catch(console.error);
  }

  private async subscribeAccounts () {
    // Wait until account ready
    await this.koniState.eventService.waitAccountReady;
    this.beforeAccount = { ...this.pairSubject.value };

    const pairs = this.pairSubject.asObservable();
    const modifyPairs = this._modifyPair.observable;
    const accountGroups = this._accountProxy.observable;

    pairs.subscribe((subjectInfo) => {
      // Check if accounts changed
      const beforeAddresses = Object.keys(this.beforeAccount);
      const afterAddresses = Object.keys(subjectInfo);

      if (beforeAddresses.length > afterAddresses.length) {
        const removedAddresses = beforeAddresses.filter((address) => !afterAddresses.includes(address));

        // Remove account
        removedAddresses.forEach((address) => {
          this.koniState.eventService.emit('account.remove', address);
        });
      } else if (beforeAddresses.length < afterAddresses.length) {
        const addedAddresses = afterAddresses.filter((address) => !beforeAddresses.includes(address));

        // Add account
        addedAddresses.forEach((address) => {
          this.koniState.eventService.emit('account.add', address);
        });
      } else {
        // Handle case update later
      }

      this.beforeAccount = { ...subjectInfo };
    });

    combineLatest([pairs, modifyPairs, accountGroups]).subscribe(([pairs, modifyPairs, accountGroups]) => {
      addLazy('combineAccounts', () => {
        const result = combineAccounts(pairs, modifyPairs, accountGroups);

        this.accountSubject.next(result);
      }, 300, 1800, false);
    });
  }

  get injected (): boolean {
    return this._injected;
  }

  setInjected (injected: boolean) {
    this._injected = injected;
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

  get accountProxies () {
    return this._accountProxy.value;
  }

  get modifyPairs () {
    return this._modifyPair.value;
  }

  get observable () {
    const pairs = this.pairSubject;
    const accounts = this.accountSubject;
    const accountProxy = this._accountProxy;
    const currentAccount = this._currentAccount;
    const contacts = this.contactSubject;

    return {
      get pairs () {
        return pairs.asObservable();
      },
      get accounts () {
        return accounts.asObservable();
      },
      get accountProxy () {
        return accountProxy.observable;
      },
      get currentAccount () {
        return currentAccount.observable;
      },
      get contacts () {
        return contacts.asObservable();
      }
    };
  }

  /* Current account */

  get currentAccount (): CurrentAccountInfo {
    return this._currentAccount.value;
  }

  private setCurrentAccount (data: CurrentAccountInfo, callback?: () => void): void {
    this._currentAccount.upsertData(data);
    callback && callback();
    this.koniState.eventService.emit('account.updateCurrent', data);
  }

  /**
   * Updates the current account proxy ID and emits an event to notify about the update.
   * For case the proxy ID is set as `ALL_ACCOUNT_KEY`, it will be updated to the first account proxy ID if there is only one account.
   *
   * Note: This function should be called after account data is updated.
   *
   * @param _proxyId - The proxy ID to be set as the current account proxy ID.
   * @param callback - Optional callback function to be executed after the current account proxy ID is updated.
   * @param preventOneAccount - Optional flag to prevent setting the proxy ID if there is only one account.
   */
  public saveCurrentAccountProxyId (_proxyId: string, callback?: (data: CurrentAccountInfo) => void, preventOneAccount?: boolean) {
    let result = this.currentAccount;

    if (!result) {
      result = {
        proxyId: _proxyId
      };
    } else {
      result.proxyId = _proxyId;
    }

    const { proxyId } = result;

    if (proxyId === ALL_ACCOUNT_KEY) {
      const pairs = this.pairs;
      const accountProxies = this.accountProxies;
      const modifyPairs = this.modifyPairs;

      const data = combineAccounts(pairs, modifyPairs, accountProxies);
      const accounts = Object.keys(data);
      const firstAccount = accounts[0];

      if (accounts.length > 1 || !firstAccount) {
        // For case have more than 1 account or no account
      } else {
        // For case have only 1 account
        if (!preventOneAccount) {
          result.proxyId = accounts[0];
        }
      }
    }

    this.setCurrentAccount(result, () => {
      callback && callback(result);
    });
  }

  /* Current account */

  /* Check address exists */
  public checkAddressExists (addresses: string[]): string {
    let result = '';

    for (const address of addresses) {
      try {
        const pair = keyring.getPair(address);

        if (pair) {
          result = pair.address;
          break;
        }
      } catch (e) {}
    }

    return result;
  }

  /* Auth address */

  public _addAddressesToAuthList (addresses: string[], isAllowed: boolean): void {
    this.koniState.getAuthorize((value) => {
      if (value && Object.keys(value).length) {
        Object.keys(value).forEach((url) => {
          addresses.forEach((address) => {
            if (isAddressValidWithAuthType(address, value[url].accountAuthType)) {
              value[url].isAllowedMap[address] = isAllowed;
            }
          });
        });

        this.koniState.setAuthorize(value);
      }
    });
  }

  public _addAddressToAuthList (address: string, isAllowed: boolean): void {
    this._addAddressesToAuthList([address], isAllowed);
  }

  /* Auth address */

  /* Account groups */

  /* Upsert account group */
  public upsertAccountProxy (data: AccountProxyData, callback?: () => void) {
    this._accountProxy.upsertByKey(data, callback);
  }

  /* Delete account group */
  public deleteAccountProxy (key: string, callback?: () => void) {
    this._accountProxy.deleteByKey(key, callback);
  }

  /* Is account proxy id */
  public isUnifiedAccount (proxyId: string): boolean {
    const accountProxies = this.accounts;

    return Object.values(accountProxies).some((value) => value.accountType === AccountProxyType.UNIFIED && value.id === proxyId);
  }

  /* Is account proxy id */
  public addressesByProxyId (proxyId: string): string[] {
    if (proxyId === ALL_ACCOUNT_KEY) {
      return this.getAllAddresses();
    }

    const accountProxies = this.accounts;

    if (accountProxies[proxyId]) {
      return Object.keys(accountProxies[proxyId].accounts.map((account) => account.address));
    } else {
      return [];
    }
  }

  /* Account group */

  /* Modify pairs */

  /* Upsert modify pairs */
  public upsertModifyPairs (data: ModifyPairStoreData) {
    this._modifyPair.upsertData(data);
  }

  /* Modify pairs */

  /* Get address for another service */

  public getAllAddresses (): string[] {
    return keyring.getAccounts().map((account) => account.address);
  }

  public getProxyId (): string | null {
    const proxyId = this.currentAccount.proxyId;

    if (proxyId === '') {
      return null;
    }

    return proxyId;
  }

  public getDecodedAddresses (accountProxy?: string, allowGetAllAccount = true): string[] {
    let proxyId: string | null | undefined = accountProxy;

    if (!accountProxy) {
      proxyId = this.getProxyId();
    }

    if (!proxyId) {
      return [];
    }

    if (proxyId === ALL_ACCOUNT_KEY) {
      return allowGetAllAccount ? this.getAllAddresses() : [];
    }

    const accountProxies = this._accountProxy.value;
    const modifyPairs = this._modifyPair.value;

    if (!accountProxies[proxyId]) {
      return [proxyId];
    } else {
      return Object.keys(modifyPairs).filter((address) => modifyPairs[address].accountProxyId === proxyId);
    }
  }

  /* Get address for another service */

  /**
   * Account ref
   * @deprecated
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

  public removeNoneHardwareGenesisHash () {
    const pairs = keyring.getPairs();

    const needUpdatePairs = pairs.filter(({ meta: { genesisHash,
      isHardware } }) => !isHardware && genesisHash && genesisHash !== '');

    needUpdatePairs.forEach((pair) => {
      keyring.saveAccountMeta(pair, { ...pair.meta, genesisHash: '' });
    });
  }

  public updateMetadataForPair () {
    const pairs = keyring.getPairs();
    const pairMap = Object.fromEntries(pairs.map((pair) => [pair.address, pair]));

    const needUpdateSet = new Set<string>();
    const needUpdateGenesisHash = pairs.filter(({ meta: { genesisHash,
      isHardware } }) => !isHardware && genesisHash && genesisHash !== '').map((pair) => pair.address);

    needUpdateGenesisHash.forEach((address) => {
      pairMap[address].meta.genesisHash = '';
      needUpdateSet.add(address);
    });

    const deepSearchParentId = (_parentAddress: string, _suri: string): [string, string] => {
      const parent = pairMap[_parentAddress];

      if (parent) {
        const metadata = parent.meta as AccountMetadataData;
        const parentAddress = metadata.parentAddress;
        const parentSuri = metadata.suri;
        const isExternal = metadata.isExternal;

        if (parentAddress && parentSuri && !isExternal) {
          const suri = [parentSuri, _suri].join('');

          return deepSearchParentId(parentAddress, suri);
        }
      }

      return [_parentAddress, _suri];
    };

    for (const pair of Object.values(pairMap)) {
      const address = pair.address;
      const metadata = pair.meta as AccountMetadataData;
      const parentAddress = metadata.parentAddress;
      const parentSuri = metadata.suri;

      if (parentAddress && parentSuri) {
        const [_parentAddress, _parentSuri] = deepSearchParentId(parentAddress, parentSuri);

        if (parentAddress !== _parentAddress && parentSuri !== _parentSuri) {
          metadata.parentAddress = _parentAddress;
          metadata.suri = _parentSuri;
          needUpdateSet.add(address);
        }
      }
    }

    Array.from(needUpdateSet).forEach((address) => {
      const pair = pairMap[address];

      keyring.saveAccountMeta(pair, pair.meta);
    });
  }

  public findNetworkKeyByGenesisHash (genesisHash?: string): string | undefined {
    const [slug] = this.koniState.findNetworkKeyByGenesisHash(genesisHash);

    return slug;
  }

  public enableChain (slug: string) {
    this.koniState.enableChain(slug, true).catch(console.error);
  }

  /* Others */

  /* Reset wallet */
  resetWallet () {
    this.upsertModifyPairs({});
    this._accountProxy.clear();
    this.saveCurrentAccountProxyId(ALL_ACCOUNT_KEY);
  }

  /* Reset wallet */
}
