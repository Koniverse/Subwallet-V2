// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { RequestAccountBatchExportV2, RequestBatchRestoreV2, RequestJsonRestoreV2, ResponseAccountBatchExportV2 } from '@subwallet/extension-base/background/KoniTypes';
import { ResponseJsonGetAccountInfo } from '@subwallet/extension-base/background/types';
import { ALL_ACCOUNT_KEY } from '@subwallet/extension-base/constants';
import { createPair } from '@subwallet/keyring';
import { KeypairType, KeyringPair$Json } from '@subwallet/keyring/types';
import { keyring } from '@subwallet/ui-keyring';
import { t } from 'i18next';

import { assert, hexToU8a, isHex, u8aToString } from '@polkadot/util';
import { base64Decode, jsonDecrypt } from '@polkadot/util-crypto';
import { EncryptedJson, Prefix } from '@polkadot/util-crypto/types';

import { AccountBaseHandler } from './Base';

/**
 * @class AccountJsonHandler
 * @extends AccountBaseHandler
 * @description Handler for account's JSON
 * */
export class AccountJsonHandler extends AccountBaseHandler {
  private decodeAddress = (key: string | Uint8Array, ignoreChecksum?: boolean, ss58Format?: Prefix): Uint8Array => {
    return keyring.decodeAddress(key, ignoreChecksum, ss58Format);
  };

  private encodeAddress = (key: string | Uint8Array, ss58Format?: Prefix): string => {
    return keyring.encodeAddress(key, ss58Format);
  };

  private validatePassword (json: KeyringPair$Json, password: string): boolean {
    const cryptoType = Array.isArray(json.encoding.content) ? json.encoding.content[1] : 'ed25519';
    const encType = Array.isArray(json.encoding.type) ? json.encoding.type : [json.encoding.type];
    const pair = createPair(
      { toSS58: this.encodeAddress, type: cryptoType as KeypairType },
      { publicKey: this.decodeAddress(json.address, true) },
      json.meta,
      isHex(json.encoded) ? hexToU8a(json.encoded) : base64Decode(json.encoded),
      encType
    );

    const exists = this.state.checkAddressExists([pair.address]);

    assert(!exists, t('Account already exists account: {{name}}', { replace: { name: exists?.name || exists?.address || pair.address } }));

    // unlock then lock (locking cleans secretKey, so needs to be last)
    try {
      pair.decodePkcs8(password);
      pair.lock();

      return true;
    } catch (e) {
      console.error(e);

      return false;
    }
  }

  public jsonRestoreV2 ({ address, file, isAllowed, password, withMasterPassword }: RequestJsonRestoreV2): void {
    const isPasswordValidated = this.validatePassword(file, password);

    if (isPasswordValidated) {
      try {
        this.state.saveCurrentAccountProxyId(address, () => {
          const newAccount = keyring.restoreAccount(file, password, withMasterPassword);

          // genesisHash is not used in SubWallet => reset it to empty string, if it is not hardware wallet
          if (!newAccount.meta?.isHardware && newAccount.meta?.genesisHash !== '') {
            keyring.saveAccountMeta(newAccount, { ...newAccount.meta, genesisHash: '' });
          }

          this.state.updateMetadataForPair();
          this.state._addAddressToAuthList(address, isAllowed);
        });
      } catch (error) {
        throw new Error((error as Error).message);
      }
    } else {
      throw new Error(t('Wrong password'));
    }
  }

  private validatedAccountsPassword (json: EncryptedJson, password: string): boolean {
    try {
      u8aToString(jsonDecrypt(json, password));

      return true;
    } catch (e) {
      return false;
    }
  }

  public batchRestoreV2 ({ accountsInfo, file, isAllowed, password }: RequestBatchRestoreV2): void {
    const addressList: string[] = accountsInfo.map((acc) => acc.address);
    const isPasswordValidated = this.validatedAccountsPassword(file, password);
    const exists = this.state.checkAddressExists(addressList);

    assert(!exists, t('Account already exists account: {{name}}', { replace: { name: exists?.name || exists?.address || '' } }));

    if (isPasswordValidated) {
      try {
        this.state.saveCurrentAccountProxyId(ALL_ACCOUNT_KEY, () => {
          keyring.restoreAccounts(file, password);

          this.state.updateMetadataForPair();
          this.state._addAddressesToAuthList(addressList, isAllowed);
        });
      } catch (error) {
        throw new Error((error as Error).message);
      }
    } else {
      throw new Error(t('Wrong password'));
    }
  }

  public jsonGetAccountInfo (json: KeyringPair$Json): ResponseJsonGetAccountInfo {
    try {
      const { address, meta: { genesisHash, name }, type } = keyring.createFromJson(json);

      return {
        address,
        genesisHash,
        name,
        type
      } as ResponseJsonGetAccountInfo;
    } catch (e) {
      console.error(e);
      throw new Error((e as Error).message);
    }
  }

  public async batchExportV2 (request: RequestAccountBatchExportV2): Promise<ResponseAccountBatchExportV2> {
    const { addresses, password } = request;

    try {
      if (addresses && !addresses.length) {
        throw new Error(t('No accounts found to export'));
      }

      return {
        exportedJson: await keyring.backupAccounts(password, addresses)
      };
    } catch (e) {
      const error = e as Error;

      if (error.message === 'Invalid master password') {
        throw new Error(t('Wrong password'));
      } else {
        throw error;
      }
    }
  }
}
