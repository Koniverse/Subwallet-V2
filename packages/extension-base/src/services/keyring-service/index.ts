// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { CurrentAccountInfo, KeyringState } from '@subwallet/extension-base/background/KoniTypes';
import { ALL_ACCOUNT_KEY } from '@subwallet/extension-base/constants';
import KoniState from '@subwallet/extension-base/koni/background/handlers/State';
import { AccountAbstractionService } from '@subwallet/extension-base/services/account-abstraction-service/service';
import { CurrentAccountStore } from '@subwallet/extension-base/stores';
import { AccountProxyMap, AccountProxyStoreData, ModifyPairStoreData } from '@subwallet/extension-base/types';
import { addLazy } from '@subwallet/extension-base/utils';
import { combineAccountsWithSubjectInfo } from '@subwallet/extension-base/utils/account/transform';
import { InjectedAccountWithMeta } from '@subwallet/extension-inject/types';
import { keyring } from '@subwallet/ui-keyring';
import { SubjectInfo } from '@subwallet/ui-keyring/observable/types';
import { BehaviorSubject, combineLatest } from 'rxjs';

import { stringShorten } from '@polkadot/util';

export class KeyringService {
  private readonly currentAccountStore = new CurrentAccountStore();
  readonly currentAccountSubject = new BehaviorSubject<CurrentAccountInfo>({ address: '', currentGenesisHash: null });

  readonly addressesSubject = keyring.addresses.subject;
  public readonly pairSubject = keyring.accounts.subject;
  private beforeAccount: SubjectInfo = this.pairSubject.value;
  private injected: boolean;
  private readonly accountAbstractionService: AccountAbstractionService;

  private readonly _modifyPairSubject = new BehaviorSubject<ModifyPairStoreData>({});
  private readonly _accountProxySubject = new BehaviorSubject<AccountProxyStoreData>({});

  private readonly accountSubject = new BehaviorSubject<AccountProxyMap>({});

  readonly keyringStateSubject = new BehaviorSubject<KeyringState>({
    isReady: false,
    hasMasterPassword: false,
    isLocked: false
  });

  constructor (private koniState: KoniState) {
    this.injected = false;
    this.koniState.eventService.waitCryptoReady.then(() => {
      this.currentAccountStore.get('CurrentAccountInfo', (rs) => {
        rs && this.currentAccountSubject.next(rs);
      });
      this.subscribeAccounts().catch(console.error);
      this.subscribeCASetting().catch(console.error);
    }).catch(console.error);

    this.accountAbstractionService = AccountAbstractionService.getInstance();
  }

  private async subscribeAccounts () {
    // Wait until account ready
    await this.koniState.eventService.waitAccountReady;

    this.beforeAccount = { ...this.pairSubject.value };

    const pairs = this.pairSubject.asObservable();
    const modifyPairs = this._modifyPairSubject.asObservable();
    const accountGroups = this._accountProxySubject.asObservable();
    const chainInfoMap = this.koniState.chainService.subscribeChainInfoMap().asObservable();
    const aaProxyMap = this.accountAbstractionService.observables.aaProxyMap;
    let fireOnFirst = true;

    // emit event
    pairs.subscribe((subjectInfo) => {
      // Check if accounts changed
      const beforeAddresses = Object.keys(this.beforeAccount);
      const afterAddresses = Object.keys(subjectInfo);

      if (beforeAddresses.length > afterAddresses.length) {
        const removedAddresses = beforeAddresses.filter((address) => !afterAddresses.includes(address));

        // Remove account
        removedAddresses.forEach((address) => {
          this.koniState.eventService.emit('account.remove', address);
          this.accountAbstractionService.removeOwner(address);
        });
      } else if (beforeAddresses.length < afterAddresses.length) {
        const addedAddresses = afterAddresses.filter((address) => !beforeAddresses.includes(address));

        // Add account
        addedAddresses.forEach((address) => {
          this.koniState.eventService.emit('account.add', address);
          this.accountAbstractionService.getAndCreateAAProxyIfNeed(address).catch(console.error);
        });
      } else {
        // Handle case update later
      }

      this.beforeAccount = { ...subjectInfo };
    });

    combineLatest([pairs, modifyPairs, accountGroups, chainInfoMap, aaProxyMap]).subscribe(([pairs, modifyPairs, accountGroups, chainInfoMap, aaProxyMap]) => {
      addLazy('combineAccounts', () => {
        const result = combineAccountsWithSubjectInfo(pairs, modifyPairs, accountGroups, aaProxyMap, chainInfoMap);

        fireOnFirst = false;
        this.accountSubject.next(result);
      }, 300, 1800, fireOnFirst);
    });

    this.accountSubject.subscribe((value) => console.debug('accountSubject', value));
  }

  private async subscribeCASetting () {
    await this.koniState.eventService.waitInjectReady;
    const subject = this.koniState.settingService.getCASubject();
    let currentProvider = (await this.koniState.settingService.getCASettings()).caProvider;

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    subject.asObservable().subscribe(async ({ caProvider }) => {
      if (currentProvider !== caProvider) {
        const oldProvider = currentProvider;

        currentProvider = caProvider;

        const oldPairs = keyring.getPairs();
        const accounts = oldPairs.filter(({ meta }) => meta.aaSdk === oldProvider && meta.isInjected);
        const currentAddress = this.currentAccountSubject.value.address;
        const currentAccountOwner = accounts.find(({ address }) => address === currentAddress)?.meta.smartAccountOwner;

        // await this.addInjectAccounts(accounts.map(({ meta, type }): InjectedAccountWithMeta => ({
        //   address: meta.smartAccountOwner as string,
        //   meta: {
        //     source: meta.source as string,
        //     name: meta.name as string
        //   },
        //   type
        // })), caProvider);

        if (currentAccountOwner) {
          const newPairs = keyring.getPairs();
          const newPair = newPairs.find(({ meta }) => meta.smartAccountOwner === currentAccountOwner && meta.aaSdk === caProvider);

          if (newPair) {
            this.setCurrentAccount({ address: newPair.address, currentGenesisHash: null });
          }
        }

        keyring.removeInjects(accounts.map(({ address }) => address));
      }
    });
  }

  get keyringState () {
    return this.keyringStateSubject.value;
  }

  updateKeyringState (isReady = true) {
    if (!this.keyringState.isReady && isReady) {
      this.koniState.eventService.waitCryptoReady.then(() => {
        this.koniState.eventService.emit('keyring.ready', true);
        this.koniState.eventService.emit('account.ready', true);
      }).catch(console.error);
    }

    this.keyringStateSubject.next({
      hasMasterPassword: !!keyring.keyring?.hasMasterPassword,
      isLocked: !!keyring.keyring?.isLocked,
      isReady: isReady
    });
  }

  get accounts (): SubjectInfo {
    return this.pairSubject.value;
  }

  get addresses (): SubjectInfo {
    return this.addressesSubject.value;
  }

  get currentAccount (): CurrentAccountInfo {
    return this.currentAccountSubject.value;
  }

  setCurrentAccount (currentAccountData: CurrentAccountInfo) {
    this.currentAccountSubject.next(currentAccountData);
    this.koniState.eventService.emit('account.updateCurrent', currentAccountData);
    this.currentAccountStore.set('CurrentAccountInfo', currentAccountData);
  }

  public lock () {
    keyring.lockAll();
    this.updateKeyringState();
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

    Object.keys(this.accounts).forEach((adr) => {
      afterAccounts[adr] = true;
    });

    accounts.forEach((value) => {
      afterAccounts[value.address] = true;
    });

    if (Object.keys(afterAccounts).length === 1) {
      this.currentAccountSubject.next({ address: Object.keys(afterAccounts)[0], currentGenesisHash: null });
    } else if (Object.keys(afterAccounts).indexOf(currentAddress) === -1) {
      this.currentAccountSubject.next({ address: ALL_ACCOUNT_KEY, currentGenesisHash: null });
    }

    if (!this.injected) {
      this.koniState.eventService.emit('inject.ready', true);
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
    const afterAccounts = Object.keys(this.accounts).filter((address) => (addresses.indexOf(address) < 0));

    if (afterAccounts.length === 1) {
      this.currentAccountSubject.next({ address: afterAccounts[0], currentGenesisHash: null });
    } else if (addresses.indexOf(currentAddress) === -1) {
      this.currentAccountSubject.next({ address: ALL_ACCOUNT_KEY, currentGenesisHash: null });
    }

    keyring.removeInjects(addresses);
  }

  /* Inject */

  /* Reset */
  async resetWallet (resetAll: boolean) {
    keyring.resetWallet(resetAll);
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 1500);
    });
    this.updateKeyringState();
    this.currentAccountSubject.next({ address: ALL_ACCOUNT_KEY, currentGenesisHash: null });
  }
  /* Reset */

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
