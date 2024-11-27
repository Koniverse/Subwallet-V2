// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { CommonAccountErrorType, MnemonicType, RequestAccountCreateSuriV2, RequestExportAccountProxyMnemonic, RequestMnemonicCreateV2, RequestMnemonicValidateV2, ResponseAccountCreateSuriV2, ResponseExportAccountProxyMnemonic, ResponseMnemonicCreateV2, ResponseMnemonicValidateV2, SWCommonAccountError } from '@subwallet/extension-base/types';
import { createAccountProxyId, getSuri } from '@subwallet/extension-base/utils';
import { tonMnemonicGenerate } from '@subwallet/keyring';
import { KeypairType, KeyringPair } from '@subwallet/keyring/types';
import { tonMnemonicValidate } from '@subwallet/keyring/utils';
import { keyring } from '@subwallet/ui-keyring';
import { t } from 'i18next';

import { assert, isHex } from '@polkadot/util';
import { keyExtractSuri, mnemonicGenerate, mnemonicValidate } from '@polkadot/util-crypto';

import { AccountBaseHandler } from './Base';

export const SEED_DEFAULT_LENGTH = 12;
export const SEED_LENGTHS = [12, 15, 18, 21, 24];

/**
 * @class AccountMnemonicHandler
 * @extends AccountBaseHandler
 * @description Handler for account's mnemonic
 * */
export class AccountMnemonicHandler extends AccountBaseHandler {
  /* Create with mnemonic */

  /* Create seed */
  public async mnemonicCreateV2 ({ length = SEED_DEFAULT_LENGTH, mnemonic: _seed, type = 'general' }: RequestMnemonicCreateV2): Promise<ResponseMnemonicCreateV2> {
    const types: KeypairType[] = type === 'general' ? ['sr25519', 'ethereum', 'ton', 'cardano'] : ['ton-native'];
    const seed = _seed ||
    type === 'general'
      ? mnemonicGenerate(length)
      : await tonMnemonicGenerate(length);
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
        pairTypes = ['ton-native'];
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

    const exists = this.state.checkAddressExists(Object.values(rs.addressMap));

    assert(!exists, t('Account already exists under the name {{name}}', { replace: { name: exists?.name || exists?.address || '' } }));

    return rs;
  }

  /* Add accounts from mnemonic */
  public accountsCreateSuriV2 (request: RequestAccountCreateSuriV2): ResponseAccountCreateSuriV2 {
    const { isAllowed, name, password, suri: _suri, type } = request;
    const addressDict = {} as Record<KeypairType, string>;
    let changedAccount = false;
    const hasMasterPassword = keyring.keyring.hasMasterPassword;
    const types: KeypairType[] = type ? [type] : ['sr25519', 'ethereum', 'ton', 'cardano'];

    if (!hasMasterPassword) {
      if (!password) {
        throw Error(t('The password of each account is needed to set up master password'));
      } else {
        keyring.changeMasterPassword(password);
        this.parentService.updateKeyringState();
      }
    }

    if (!types || !types.length) {
      throw Error(t('Please choose at least one account type'));
    }

    const nameExists = this.state.checkNameExists(name);

    if (nameExists) {
      throw new SWCommonAccountError(CommonAccountErrorType.ACCOUNT_NAME_EXISTED);
    }

    const multiChain = types.length > 1;
    const proxyId = multiChain ? createAccountProxyId(_suri) : '';

    const modifiedPairs = this.state.modifyPairs;

    types.forEach((type) => {
      const suri = getSuri(_suri, type);
      const pair = keyring.createFromUri(suri, {}, type);
      const address = pair.address;

      modifiedPairs[address] = { accountProxyId: proxyId, migrated: true, key: address };
      addressDict[type] = address;
    });

    const exists = this.state.checkAddressExists(Object.values(addressDict));

    assert(!exists, t('Account already exists under the name {{name}}', { replace: { name: exists?.name || exists?.address || '' } }));

    // Upsert account group first, to avoid combine latest have no account group data.
    if (proxyId) {
      this.state.upsertAccountProxyByKey({ id: proxyId, name });
    }

    // Upsert modify pair before add account to keyring
    this.state.upsertModifyPairs(modifiedPairs);

    types.forEach((type) => {
      const suri = getSuri(_suri, type);
      const { derivePath } = keyExtractSuri(suri);
      const metadata = {
        name,
        derivationPath: derivePath ? derivePath.substring(1) : undefined
      };

      const rs = keyring.addUri(suri, metadata, type);
      const address = rs.pair.address;

      this.state._addAddressToAuthList(address, isAllowed);

      if (!changedAccount) {
        if (!proxyId) {
          this.state.saveCurrentAccountProxyId(address);
        } else {
          this.state.saveCurrentAccountProxyId(proxyId);
        }

        changedAccount = true;
      }
    });

    return addressDict;
  }

  /* Create with mnemonic */

  /* Export mnemonic */

  public exportAccountProxyMnemonic ({ password, proxyId }: RequestExportAccountProxyMnemonic): ResponseExportAccountProxyMnemonic {
    const isUnified = this.state.isUnifiedAccount(proxyId);

    if (!isUnified) {
      const pair = keyring.getPair(proxyId);

      assert(pair, t('Unable to find account'));

      const result = pair.exportMnemonic(password);

      return { result };
    } else {
      const modifyPairs = this.state.modifyPairs;
      const addresses = Object.keys(modifyPairs).filter((address) => modifyPairs[address].accountProxyId === proxyId);

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

  /* Export mnemonic */
}
