// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { stringShorten } from '@polkadot/util';
import { isEthereumAddress } from '@polkadot/util-crypto';
import { CurrentAccountInfo, KeyringState } from '@subwallet/extension-base/background/KoniTypes';
import { ALL_ACCOUNT_KEY } from '@subwallet/extension-base/constants';
import { ParticleAAHandler } from '@subwallet/extension-base/services/chain-abstraction-service/particle';
import { EventService } from '@subwallet/extension-base/services/event-service';
import { CurrentAccountStore } from '@subwallet/extension-base/stores';
import { InjectedAccountWithMeta } from '@subwallet/extension-inject/types';
import { keyring } from '@subwallet/ui-keyring';
import { SubjectInfo } from '@subwallet/ui-keyring/observable/types';
import { InjectAccount } from '@subwallet/ui-keyring/types';
import { BehaviorSubject } from 'rxjs';

export class KeyringService {
  private readonly currentAccountStore = new CurrentAccountStore();
  readonly currentAccountSubject = new BehaviorSubject<CurrentAccountInfo>({ address: '', currentGenesisHash: null });

  readonly addressesSubject = keyring.addresses.subject;
  public readonly accountSubject = keyring.accounts.subject;
  private beforeAccount: SubjectInfo = this.accountSubject.value;
  private injected: boolean;

  readonly keyringStateSubject = new BehaviorSubject<KeyringState>({
    isReady: false,
    hasMasterPassword: false,
    isLocked: false
  });

  constructor (private eventService: EventService) {
    this.injected = false;
    this.eventService.waitCryptoReady.then(() => {
      this.currentAccountStore.get('CurrentAccountInfo', (rs) => {
        rs && this.currentAccountSubject.next(rs);
      });
      this.subscribeAccounts().catch(console.error);
    }).catch(console.error);
  }

  private async subscribeAccounts () {
    // Wait until account ready
    await this.eventService.waitAccountReady;

    this.beforeAccount = { ...this.accountSubject.value };

    this.accountSubject.subscribe((subjectInfo) => {
      // Check if accounts changed
      const beforeAddresses = Object.keys(this.beforeAccount);
      const afterAddresses = Object.keys(subjectInfo);

      if (beforeAddresses.length > afterAddresses.length) {
        const removedAddresses = beforeAddresses.filter((address) => !afterAddresses.includes(address));

        // Remove account
        removedAddresses.forEach((address) => {
          this.eventService.emit('account.remove', address);
        });
      } else if (beforeAddresses.length < afterAddresses.length) {
        const addedAddresses = afterAddresses.filter((address) => !beforeAddresses.includes(address));

        // Add account
        addedAddresses.forEach((address) => {
          this.eventService.emit('account.add', address);
        });
      } else {
        // Handle case update later
      }

      this.beforeAccount = { ...subjectInfo };
    });
  }

  get keyringState () {
    return this.keyringStateSubject.value;
  }

  updateKeyringState (isReady = true) {
    if (!this.keyringState.isReady && isReady) {
      this.eventService.waitCryptoReady.then(() => {
        this.eventService.emit('keyring.ready', true);
        this.eventService.emit('account.ready', true);
      }).catch(console.error);
    }

    this.keyringStateSubject.next({
      hasMasterPassword: !!keyring.keyring?.hasMasterPassword,
      isLocked: !!keyring.keyring?.isLocked,
      isReady: isReady
    });
  }

  get accounts (): SubjectInfo {
    return this.accountSubject.value;
  }

  get addresses (): SubjectInfo {
    return this.addressesSubject.value;
  }

  get currentAccount (): CurrentAccountInfo {
    return this.currentAccountSubject.value;
  }

  setCurrentAccount (currentAccountData: CurrentAccountInfo) {
    this.currentAccountSubject.next(currentAccountData);
    this.eventService.emit('account.updateCurrent', currentAccountData);
    this.currentAccountStore.set('CurrentAccountInfo', currentAccountData);
  }

  public lock () {
    keyring.lockAll();
    this.updateKeyringState();
  }

  /* Inject */

  public async addInjectAccounts (_accounts: InjectedAccountWithMeta[]) {
    const accounts: InjectAccount[] = await Promise.all(_accounts.map(async (acc): Promise<InjectAccount> => {
        const isEthereum = isEthereumAddress(acc.address);

        if (isEthereum) {
          const smartAddress = await ParticleAAHandler.getSmartAccount(acc.address);

          return {
            ...acc,
            address: smartAddress,
            meta: {
              ...acc.meta,
              isSmartAccount: true,
              smartAccountOwner: acc.address,
              aaSdk: 'particle',
              aaProvider: {
                name: 'BICONOMY',
                version: '2.0.0'
              }
            }
          };
        }

        return acc;
      })
    );

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
      this.eventService.emit('inject.ready', true);
      this.injected = true;
    }
  }

  public async removeInjectAccounts (_addresses: string[]) {
    const convertedAddresses = await Promise.all(_addresses.map(async (address) => {
      const isEthereum = isEthereumAddress(address);

      if (isEthereum) {
        return await ParticleAAHandler.getSmartAccount(address);
      }

      return address;
    }));


    const addresses = convertedAddresses.map((address) => {
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
