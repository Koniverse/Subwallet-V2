// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { RequestChangeMasterPassword, RequestMigratePassword, ResponseChangeMasterPassword, ResponseMigratePassword } from '@subwallet/extension-base/background/KoniTypes';
import { ALL_ACCOUNT_KEY } from '@subwallet/extension-base/constants';
import { RequestAccountProxyEdit, RequestAccountProxyForget } from '@subwallet/extension-base/types';
import { modifyAccountName } from '@subwallet/extension-base/utils';
import { KeyringPair$Meta } from '@subwallet/keyring/types';
import { keyring } from '@subwallet/ui-keyring';
import { t } from 'i18next';

import { assert } from '@polkadot/util';

import { AccountBaseHandler } from './Base';

/**
 * @class AccountModifyHandler
 * @extends AccountBaseHandler
 * @description Handler for modify account actions (change master password, migrate master password, edit account, forget account, ...)
 * */
export class AccountModifyHandler extends AccountBaseHandler {
  public keyringChangeMasterPassword (request: RequestChangeMasterPassword, callback: () => void): ResponseChangeMasterPassword {
    const { createNew, newPassword, oldPassword } = request;

    try {
      // Remove isMasterPassword meta if createNew
      if (createNew && !keyring.keyring.hasMasterPassword) {
        const pairs = keyring.getPairs();

        for (const pair of pairs) {
          if (pair.meta.isInjected) {
            // Empty
          } else {
            const meta: KeyringPair$Meta = {
              ...pair.meta,
              isMasterPassword: false
            };

            if (!meta.originGenesisHash) {
              meta.genesisHash = '';
            }

            pair.setMeta(meta);
            keyring.saveAccountMeta(pair, pair.meta);
          }
        }
      }

      keyring.changeMasterPassword(newPassword, oldPassword);
    } catch (e) {
      console.error(e);

      return {
        errors: [t((e as Error).message)],
        status: false
      };
    }

    this.parentService.updateKeyringState();

    callback();

    return {
      status: true,
      errors: []
    };
  }

  public keyringMigrateMasterPassword (request: RequestMigratePassword, callback: () => void): ResponseMigratePassword {
    const { address, password } = request;

    try {
      keyring.migrateWithMasterPassword(address, password);

      callback();
    } catch (e) {
      console.error(e);

      return {
        errors: [(e as Error).message],
        status: false
      };
    }

    return {
      status: true,
      errors: []
    };
  }

  public accountsEdit ({ name, proxyId }: RequestAccountProxyEdit): boolean {
    const accountProxies = this.state.accountProxies;
    const modifyPairs = this.state.modifyPairs;

    if (!accountProxies[proxyId]) {
      const pair = keyring.getPair(proxyId);

      assert(pair, t('Unable to find account'));

      keyring.saveAccountMeta(pair, { ...pair.meta, name });
    } else {
      const accountProxy = accountProxies[proxyId];
      const addresses = Object.keys(modifyPairs).filter((address) => modifyPairs[address].accountProxyId === proxyId);

      accountProxy.name = name;
      this.state.upsertAccountProxy(accountProxy);

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
    const modifyPairs = this.state.modifyPairs;
    const isUnified = this.state.isUnifiedAccount(proxyId);

    let addresses: string[];

    if (!isUnified) {
      addresses = [proxyId];
    } else {
      addresses = Object.keys(modifyPairs).filter((address) => modifyPairs[address].accountProxyId === proxyId);

      this.state.deleteAccountProxy(proxyId);
      this.parentService.eventRemoveAccount(proxyId);
    }

    for (const address of addresses) {
      delete modifyPairs[address];
    }

    this.state.upsertModifyPairs(modifyPairs);

    for (const address of addresses) {
      keyring.forgetAccount(address);
    }

    await Promise.all(addresses.map((address) => new Promise<void>((resolve) => this.state.removeAccountRef(address, resolve))));

    this.state.saveCurrentAccountProxyId(ALL_ACCOUNT_KEY);

    return addresses;
  }
}
