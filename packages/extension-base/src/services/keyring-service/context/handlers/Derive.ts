// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { ALL_ACCOUNT_KEY } from '@subwallet/extension-base/constants';
import { CreateDeriveAccountInfo, DeriveAccountInfo, RequestDeriveCreateMultiple, RequestDeriveCreateV3, RequestDeriveValidateV2, RequestGetDeriveAccounts, ResponseDeriveValidateV2, ResponseGetDeriveAccounts } from '@subwallet/extension-base/types';
import { createAccountProxyId, derivePair, findNextDerivePair } from '@subwallet/extension-base/utils';
import { KeyringPair, KeyringPair$Meta, SubstrateKeypairTypes } from '@subwallet/keyring/types';
import { keyring } from '@subwallet/ui-keyring';
import { t } from 'i18next';

import { assert } from '@polkadot/util';

import { AccountBaseHandler } from './Base';

/**
 * @class AccountDeriveHandler
 * @extends AccountBaseHandler
 * @description Handler for account derivation
 * */
export class AccountDeriveHandler extends AccountBaseHandler {
  /* Derive */

  /**
   * @func derivationCreateMultiple
   * @desc Derive multi account
   * @todo Must update before re-use
   * @deprecated
   */
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
        this.state._addAddressToAuthList(address, isAllowed);
        result.push(childPair);
      } catch (e) {
        console.log(e);
      }
    }

    if (result.length === 1) {
      this.state.saveCurrentAccountProxyId(result[0].address);
    } else {
      this.state.saveCurrentAccountProxyId(ALL_ACCOUNT_KEY);
    }

    return true;
  }

  /**
   * @func getListDeriveAccounts
   * @desc Get a derivation account list.
   * @todo Must update before re-use
   * @deprecated
   */
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

  /* Auto create derive account for solo account */
  private deriveSoloAccount (request: RequestDeriveCreateV3): boolean {
    const { name, proxyId, suri } = request;

    const parentPair = keyring.getPair(proxyId);

    assert(parentPair, t('Unable to find account'));

    const isSpecialTon = parentPair.type === 'ton-native';

    assert(!isSpecialTon, t('Cannot derive for this account'));

    const isSubstrate = SubstrateKeypairTypes.includes(parentPair.type);

    assert(!isSubstrate ? !suri : true, t('Cannot derive for this account'));

    if (parentPair.isLocked) {
      keyring.unlockPair(parentPair.address);
    }

    let childPair: KeyringPair | undefined;

    if (suri) {
      childPair = parentPair.substrate.derive(suri, { name, parentAddress: proxyId, suri });
    } else {
      const { deriveIndex } = findNextDerivePair(parentPair.address);

      childPair = derivePair(parentPair, name, deriveIndex);
    }

    if (!childPair) {
      throw Error(t('Cannot derive for this account'));
    }

    const address = childPair.address;
    const exists = this.state.checkAddressExists([childPair.address]);

    assert(!exists, t('Account already exists: {{name}}', { replace: { name: exists?.name || exists?.address || childPair.address } }));

    keyring.addPair(childPair, true);

    this.state.updateMetadataForPair();
    this.state.saveCurrentAccountProxyId(address, () => {
      this.state._addAddressToAuthList(address, true);
    });

    return true;
  }

  /* Auto create derive account for solo account */
  private deriveUnifiedAccount (request: RequestDeriveCreateV3): boolean {
    const { name, proxyId: parentProxyId, suri: _suri } = request;
    const accountProxyData = this.state.accountProxies;
    const accountProxy = accountProxyData[parentProxyId];

    assert(!accountProxy.parentId && !_suri, t('Cannot derive this account with suri'));

    const modifyPairs = this.state.modifyPairs;
    const addresses = Object.keys(modifyPairs).filter((address) => modifyPairs[address].accountProxyId === parentProxyId);
    const firstAddress = addresses[0];

    assert(firstAddress, t('Cannot find account'));

    const nextDeriveData = findNextDerivePair(firstAddress);
    const { deriveIndex } = nextDeriveData;
    const suri = `//${deriveIndex}`;
    const proxyId = createAccountProxyId(parentProxyId, suri);
    const pairs: KeyringPair[] = [];

    this.state.upsertAccountProxyByKey({ id: proxyId, name, parentId: parentProxyId, suri: suri });

    for (const parentAddress of addresses) {
      const parentPair = keyring.getPair(parentAddress);
      const childPair = derivePair(parentPair, name, deriveIndex);
      const address = childPair.address;

      modifyPairs[address] = { accountProxyId: proxyId, migrated: true, key: address };
      pairs.push(childPair);
    }

    this.state.upsertModifyPairs(modifyPairs);

    for (const childPair of pairs) {
      keyring.addPair(childPair, true);
    }

    this.state.updateMetadataForPair();
    this.state.saveCurrentAccountProxyId(proxyId, () => {
      this.state._addAddressesToAuthList(pairs.map((pair) => pair.address), true);
    });

    return true;
  }

  /**
   * Derive account proxy
   *  */
  public derivationAccountProxyCreate (request: RequestDeriveCreateV3): boolean {
    const isUnified = this.state.isUnifiedAccount(request.proxyId);

    if (!isUnified) {
      const belongUnifiedAccount = this.state.belongUnifiedAccount(request.proxyId);

      if (belongUnifiedAccount) {
        throw Error(t('Cannot derive this account')); // TODO: Change message
      }
    }

    const nameExists = this.state.checkNameExists(request.name);

    if (nameExists) {
      throw Error(t('Account name already exists'));
    }

    if (!isUnified) {
      return this.deriveSoloAccount(request);
    } else {
      return this.deriveUnifiedAccount(request);
    }
  }

  /* Derive */
}
