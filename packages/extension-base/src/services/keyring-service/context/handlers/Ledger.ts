// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { RequestAccountCreateHardwareMultiple, RequestAccountCreateHardwareV2 } from '@subwallet/extension-base/background/KoniTypes';
import { ALL_ACCOUNT_KEY } from '@subwallet/extension-base/constants';
import { KeyringPair, KeyringPair$Meta } from '@subwallet/keyring/types';
import { keyring } from '@subwallet/ui-keyring';
import { t } from 'i18next';

import { assert } from '@polkadot/util';

import { AccountBaseHandler } from './Base';

/**
 * @class AccountLedgerHandler
 * @extends AccountBaseHandler
 * @description Handler for Ledger account actions
 * */
export class AccountLedgerHandler extends AccountBaseHandler {
  /* Ledger */

  /* For custom derive path */
  public async accountsCreateHardwareV2 (request: RequestAccountCreateHardwareV2): Promise<boolean> {
    const { accountIndex, address, addressOffset, genesisHash, hardwareType, isAllowed, name } = request;

    const exists = this.state.checkAddressExists([address]);

    assert(!exists, t('Account already exists'));

    const key = keyring.addHardware(address, hardwareType, {
      accountIndex,
      addressOffset,
      genesisHash,
      name,
      originGenesisHash: genesisHash
    });

    const result = key.pair;

    const _address = result.address;
    const modifiedPairs = this.state.modifyPairs;

    modifiedPairs[_address] = { migrated: true, key: _address };

    this.state.upsertModifyPairs(modifiedPairs);

    await new Promise<void>((resolve) => {
      this.state.saveCurrentAccountProxyId(_address, () => {
        this.state._addAddressToAuthList(_address, isAllowed || false);
        resolve();
      });
    });

    return true;
  }

  /* For multi select */
  public async accountsCreateHardwareMultiple ({ accounts }: RequestAccountCreateHardwareMultiple): Promise<boolean> {
    const addresses: string[] = [];

    if (!accounts.length) {
      throw new Error(t('Can\'t find an account. Please try again'));
    }

    const exists = this.state.checkAddressExists(accounts.map((account) => account.address));

    assert(!exists, t('Account already exists account: {{address}}', { replace: { address: exists } }));

    const slugMap: Record<string, string> = {};
    const modifyPairs = this.state.modifyPairs;

    for (const account of accounts) {
      const { accountIndex, address, addressOffset, genesisHash, hardwareType, isEthereum, isGeneric, name, originGenesisHash } = account;

      let result: KeyringPair;

      const baseMeta: KeyringPair$Meta = {
        name,
        hardwareType,
        accountIndex,
        addressOffset,
        genesisHash,
        originGenesisHash,
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

        const slug = this.state.findNetworkKeyByGenesisHash(genesisHash);

        if (slug) {
          slugMap[slug] = slug;
        }
      }

      const _address = result.address;

      modifyPairs[_address] = { migrated: true, key: _address };
      addresses.push(_address);

      await new Promise<void>((resolve) => {
        this.state._addAddressToAuthList(_address, true);
        resolve();
      });
    }

    // const currentAccount = this.#koniState.keyringService.context.currentAccount;
    // const allGenesisHash = currentAccount?.allGenesisHash || undefined;

    this.state.upsertModifyPairs(modifyPairs);

    if (addresses.length <= 1) {
      this.state.saveCurrentAccountProxyId(addresses[0]);
    } else {
      this.state.saveCurrentAccountProxyId(ALL_ACCOUNT_KEY);
    }

    if (Object.keys(slugMap).length) {
      for (const chainSlug of Object.keys(slugMap)) {
        this.state.enableChain(chainSlug);
      }
    }

    return true;
  }

  /* Ledger */
}
