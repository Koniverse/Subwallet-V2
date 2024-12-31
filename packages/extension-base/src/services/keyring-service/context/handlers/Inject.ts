// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { ALL_ACCOUNT_KEY } from '@subwallet/extension-base/constants';
import { InjectedAccountWithMeta } from '@subwallet/extension-inject/types';
import { keyring } from '@subwallet/ui-keyring';

import { stringShorten } from '@polkadot/util';

import { AccountBaseHandler } from './Base';

/**
 * @class AccountInjectHandler
 * @extends AccountBaseHandler
 * @description Handler for account inject actions
 * */
export class AccountInjectHandler extends AccountBaseHandler {
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

    const currentAddress = this.state.currentAccount.proxyId;
    const afterAccounts: Record<string, boolean> = {};

    Object.keys(this.state.accounts).forEach((adr) => {
      afterAccounts[adr] = true;
    });

    accounts.forEach((value) => {
      afterAccounts[value.address] = true;
    });

    if (Object.keys(afterAccounts).length === 1) {
      this.state.saveCurrentAccountProxyId(Object.keys(afterAccounts)[0]);
    } else if (Object.keys(afterAccounts).indexOf(currentAddress) === -1) {
      this.state.saveCurrentAccountProxyId(ALL_ACCOUNT_KEY);
    }

    if (!this.state.injected) {
      this.parentService.eventInjectReady();
      this.state.setInjected(true);
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
    const currentAddress = this.state.currentAccount.proxyId;
    const afterAccounts = Object.keys(this.state.accounts).filter((address) => (addresses.indexOf(address) < 0));

    if (afterAccounts.length === 1) {
      this.state.saveCurrentAccountProxyId(afterAccounts[0]);
    } else if (addresses.indexOf(currentAddress) === -1) {
      this.state.saveCurrentAccountProxyId(ALL_ACCOUNT_KEY);
    }

    keyring.removeInjects(addresses);
  }

  /* Inject */
}
