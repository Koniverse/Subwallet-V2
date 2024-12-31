// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { RequestChangeMasterPassword, RequestMigratePassword, ResponseChangeMasterPassword, ResponseMigratePassword } from '@subwallet/extension-base/background/KoniTypes';
import { ALL_ACCOUNT_KEY } from '@subwallet/extension-base/constants';
import { AccountChainType, CommonAccountErrorType, RequestAccountProxyEdit, RequestAccountProxyForget, RequestChangeTonWalletContractVersion, RequestGetAllTonWalletContractVersion, ResponseGetAllTonWalletContractVersion, SWCommonAccountError } from '@subwallet/extension-base/types';
import { KeyringPair$Meta, TonKeypairTypes, TonWalletContractVersion } from '@subwallet/keyring/types';
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

    const nameExists = this.state.checkNameExists(name, proxyId);

    if (nameExists) {
      throw new SWCommonAccountError(CommonAccountErrorType.ACCOUNT_NAME_EXISTED);
    }

    if (!accountProxies[proxyId]) {
      const pair = keyring.getPair(proxyId);

      assert(pair, t('Unable to find account'));

      keyring.saveAccountMeta(pair, { ...pair.meta, name });
    } else {
      const accountProxy = accountProxies[proxyId];
      const addresses = Object.keys(modifyPairs).filter((address) => modifyPairs[address].accountProxyId === proxyId);

      accountProxy.name = name;
      this.state.upsertAccountProxyByKey(accountProxy);

      for (const address of addresses) {
        const pair = keyring.getPair(address);

        assert(pair, t('Unable to find account'));

        keyring.saveAccountMeta(pair, { ...pair.meta, name });
      }
    }

    return true;
  }

  public async accountProxyForget ({ proxyId }: RequestAccountProxyForget): Promise<string[]> {
    const modifyPairs = this.state.modifyPairs;
    const isUnified = this.state.isUnifiedAccount(proxyId);
    const oldAccounts = Object.keys(this.state.accounts);
    const afterDeleteAccounts = oldAccounts.filter((id) => id !== proxyId);

    let addresses: string[];

    if (!isUnified) {
      addresses = [proxyId];
    } else {
      addresses = Object.keys(modifyPairs).filter((address) => modifyPairs[address].accountProxyId === proxyId);
    }

    this.state.deleteAccountProxy(proxyId);
    this.parentService.eventRemoveAccountProxy(proxyId);

    for (const address of addresses) {
      delete modifyPairs[address];
    }

    this.state.upsertModifyPairs(modifyPairs);

    for (const address of addresses) {
      keyring.forgetAccount(address);
    }

    await Promise.all(addresses.map((address) => new Promise<void>((resolve) => this.state.removeAccountRef(address, resolve))));

    // Cannot use `this.state.accounts` because it is not completely updated yet
    if (afterDeleteAccounts.length > 1) {
      this.state.saveCurrentAccountProxyId(ALL_ACCOUNT_KEY);
    } else {
      this.state.saveCurrentAccountProxyId(afterDeleteAccounts[0]);
    }

    return addresses;
  }

  public tonGetAllTonWalletContractVersion (request: RequestGetAllTonWalletContractVersion): ResponseGetAllTonWalletContractVersion {
    const { address, isTestnet } = request;

    const pair = keyring.getPair(address);

    if (!pair) {
      throw new Error('Account not found');
    }

    const contractVersion: TonWalletContractVersion = pair.meta.tonContractVersion as TonWalletContractVersion;

    const getContractAddress = (version: TonWalletContractVersion): string => {
      return pair.ton.contractWithVersion(version).address.toString({ bounceable: false, testOnly: isTestnet });
    };

    const addressMap: Record<TonWalletContractVersion, string> = {
      v3r1: getContractAddress('v3r1'),
      v3r2: getContractAddress('v3r2'),
      v4: getContractAddress('v4'),
      v5r1: getContractAddress('v5r1')
    };

    return {
      address: pair.address,
      currentVersion: contractVersion,
      addressMap: addressMap
    };
  }

  public tonAccountChangeWalletContractVersion (request: RequestChangeTonWalletContractVersion): string {
    const { address, proxyId, version } = request;

    const accounts = this.state.accounts;

    let modifyAddress = '';

    const findAddressByProxyId = () => {
      const accountProxy = accounts[proxyId];

      if (!accountProxy) {
        return;
      }

      const tonAccount = accountProxy.accounts.find((account) => account.chainType === AccountChainType.TON);

      if (tonAccount) {
        modifyAddress = tonAccount.address;
      }
    };

    if (address) {
      try {
        keyring.getPair(address);

        modifyAddress = address;
      } catch (e) {
        findAddressByProxyId();
      }
    } else {
      findAddressByProxyId();
    }

    if (!modifyAddress) {
      throw new Error('Account not found');
    }

    const pair = keyring.getPair(modifyAddress);

    if (!pair) {
      throw new Error('Account not found');
    }

    if (!TonKeypairTypes.includes(pair.type)) {
      throw new Error('Invalid account type');
    }

    const oldVerion = pair.ton.contractVersion;
    const oldAddress = pair.address;

    if (oldVerion === version) {
      return oldAddress;
    }

    const modifiedPairs = this.state.modifyPairs;
    const modifiedPair = modifiedPairs[oldAddress];
    const accountProxies = this.state.accountProxies;
    const accountProxy = accountProxies[oldAddress];

    keyring.changeTonWalletContractVersion(modifyAddress, version);

    const newAddress = pair.address;

    // Migrate modified pair
    if (modifiedPair) {
      delete modifiedPairs[oldAddress];

      if (modifiedPair.accountProxyId === oldAddress) {
        modifiedPair.accountProxyId = newAddress;
      }

      modifiedPair.key = newAddress;
      modifiedPairs[newAddress] = modifiedPair;
    }

    // Migrate account proxy
    if (accountProxy) {
      delete accountProxies[oldAddress];

      accountProxy.id = newAddress;
      accountProxies[newAddress] = accountProxy;
    }

    const pairs = keyring.getPairs();
    const childPairs = pairs.filter((pair) => pair.meta.parentAddress === oldAddress);

    for (const childPair of childPairs) {
      assert(pair, t('Unable to find account'));

      keyring.saveAccountMeta(childPair, { ...childPair.meta, parentAddress: newAddress });
    }

    // In case the current account is a single account, and is the account being modified, update the current proxy id
    const currentProxy = this.state.currentAccount.proxyId;

    if (currentProxy === oldAddress) {
      this.state.saveCurrentAccountProxyId(newAddress);
    }

    this.state.upsertModifyPairs(modifiedPairs);
    this.state.upsertAccountProxy(accountProxies);

    this.state.changeAddressAllowedAuthList(oldAddress, newAddress);

    return newAddress;
  }
}
