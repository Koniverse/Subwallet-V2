// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { AccountExternalError, AccountExternalErrorCode, RequestAccountCreateExternalV2, RequestAccountCreateWithSecretKey, RequestAccountExportPrivateKey, ResponseAccountCreateWithSecretKey, ResponseAccountExportPrivateKey } from '@subwallet/extension-base/background/KoniTypes';
import { RequestCheckPublicAndSecretKey, RequestPrivateKeyValidateV2, ResponseCheckPublicAndSecretKey, ResponsePrivateKeyValidateV2 } from '@subwallet/extension-base/types';
import { getKeypairTypeByAddress } from '@subwallet/keyring';
import { decodePair } from '@subwallet/keyring/pair/decode';
import { BitcoinKeypairTypes, KeypairType, KeyringPair, KeyringPair$Meta, TonKeypairTypes } from '@subwallet/keyring/types';
import keyring from '@subwallet/ui-keyring';
import { t } from 'i18next';

import { assert, hexStripPrefix, hexToU8a, isHex, u8aToHex } from '@polkadot/util';
import { base64Decode, keyExtractSuri } from '@polkadot/util-crypto';

import { AccountBaseHandler } from './Base';

/**
 * @class AccountSecretHandler
 * @extends AccountBaseHandler
 * @description Handler for account's mnemonic
 * */
export class AccountSecretHandler extends AccountBaseHandler {
  /* Add QR-signer, read-only */
  public async accountsCreateExternalV2 (request: RequestAccountCreateExternalV2): Promise<AccountExternalError[]> {
    const { address, isAllowed, isReadOnly, name } = request;
    const type = getKeypairTypeByAddress(address);

    try {
      try {
        const exists = keyring.getPair(address);

        if (exists) {
          if (exists.type === type) {
            return [{ code: AccountExternalErrorCode.INVALID_ADDRESS, message: t('Account exists') }];
          }
        }
      } catch (e) {

      }

      const meta: KeyringPair$Meta = {
        name,
        isExternal: true,
        isReadOnly,
        genesisHash: ''
      };

      if ([...BitcoinKeypairTypes, ...TonKeypairTypes].includes(type) && isReadOnly) {
        meta.noPublicKey = true;
      }

      const result = keyring.keyring.addFromAddress(address, meta, null, type);

      keyring.saveAccount(result);

      const _address = result.address;
      const modifiedPairs = this.state.modifyPairs;

      modifiedPairs[_address] = { migrated: true, key: _address };

      this.state.upsertModifyPairs(modifiedPairs);

      await new Promise<void>((resolve) => {
        this.state.saveCurrentAccountProxyId(_address, () => {
          this.state._addAddressToAuthList(_address, isAllowed);
          resolve();
        });
      });

      return [];
    } catch (e) {
      return [{ code: AccountExternalErrorCode.KEYRING_ERROR, message: (e as Error).message }];
    }
  }

  /* Import ethereum account with the private key  */
  private _checkValidatePrivateKey ({ privateKey }: RequestPrivateKeyValidateV2, autoAddPrefix = false): ResponsePrivateKeyValidateV2 {
    const { phrase } = keyExtractSuri(privateKey);
    const rs = { autoAddPrefix: autoAddPrefix, addressMap: {} } as ResponsePrivateKeyValidateV2;
    const types: KeypairType[] = ['ethereum'];

    types.forEach((type) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      rs.addressMap[type] = '';
    });

    if (isHex(phrase) && isHex(phrase, 256)) {
      types && types.forEach((type) => {
        rs.addressMap[type] = keyring.createFromUri(privateKey, {}, type).address;
      });
    } else {
      rs.autoAddPrefix = false;
      assert(false, t('Invalid private key. Please try again.'));
    }

    const exists = this.state.checkAddressExists(Object.values(rs.addressMap));

    assert(!exists, t('Have already created account with this private key: {{address}}', { replace: { address: exists } }));

    return rs;
  }

  public metamaskPrivateKeyValidateV2 ({ privateKey }: RequestPrivateKeyValidateV2): ResponsePrivateKeyValidateV2 {
    const isHex = privateKey.startsWith('0x');

    if (isHex) {
      return this._checkValidatePrivateKey({ privateKey });
    } else {
      return this._checkValidatePrivateKey({ privateKey: `0x${privateKey}` }, true);
    }
  }

  public async accountsCreateWithSecret (request: RequestAccountCreateWithSecretKey): Promise<ResponseAccountCreateWithSecretKey> {
    const { isAllow, isEthereum, name, publicKey, secretKey } = request;

    try {
      let keyringPair: KeyringPair | null = null;

      if (isEthereum) {
        const _secret = hexStripPrefix(secretKey);

        if (_secret.length === 64) {
          const suri = `0x${_secret}`;
          const { phrase } = keyExtractSuri(suri);

          if (isHex(phrase) && isHex(phrase, 256)) {
            const type: KeypairType = 'ethereum';

            keyringPair = keyring.createFromUri(suri, { name: name }, type);
          }
        }
      } else {
        keyringPair = keyring.keyring.createFromPair({
          publicKey: hexToU8a(publicKey),
          secretKey: hexToU8a(secretKey)
        }, { name }, 'sr25519');
      }

      if (!keyringPair) {
        return {
          success: false,
          errors: [{ code: AccountExternalErrorCode.KEYRING_ERROR, message: t('Cannot create account') }]
        };
      }

      const _address = keyringPair.address;
      const exists = this.state.checkAddressExists([_address]);

      assert(!exists, t('Account already exists account: {{address}}', { replace: { address: exists } }));

      const modifyPairs = this.state.modifyPairs;

      modifyPairs[_address] = { migrated: true, key: _address };

      this.state.upsertModifyPairs(modifyPairs);

      keyring.addPair(keyringPair, true);

      await new Promise<void>((resolve) => {
        this.state.saveCurrentAccountProxyId(_address, () => {
          this.state._addAddressToAuthList(_address, isAllow);
          resolve();
        });
      });

      return {
        errors: [],
        success: true
      };
    } catch (e) {
      return {
        success: false,
        errors: [{ code: AccountExternalErrorCode.KEYRING_ERROR, message: (e as Error).message }]
      };
    }
  }

  public checkPublicAndSecretKey ({ publicKey, secretKey }: RequestCheckPublicAndSecretKey): ResponseCheckPublicAndSecretKey {
    try {
      const _secret = hexStripPrefix(secretKey);

      if (_secret.length === 64) {
        const suri = `0x${_secret}`;
        const { phrase } = keyExtractSuri(suri);

        if (isHex(phrase) && isHex(phrase, 256)) {
          const type: KeypairType = 'ethereum';
          const address = keyring.createFromUri(suri, {}, type).address;

          return {
            address: address,
            isValid: true,
            isEthereum: true
          };
        } else {
          return {
            address: '',
            isValid: false,
            isEthereum: true
          };
        }
      }

      const keyPair = keyring.keyring.createFromPair({ publicKey: hexToU8a(publicKey), secretKey: hexToU8a(secretKey) }, {}, 'sr25519');

      return {
        address: keyPair.address,
        isValid: true,
        isEthereum: false
      };
    } catch (e) {
      console.error(e);

      return {
        address: '',
        isValid: false,
        isEthereum: false
      };
    }
  }

  public accountExportPrivateKey (request: RequestAccountExportPrivateKey): ResponseAccountExportPrivateKey {
    const { address, password } = request;
    const exportedJson = keyring.backupAccount(keyring.getPair(address), password);
    const decoded = decodePair(password, base64Decode(exportedJson.encoded), exportedJson.encoding.type);

    return {
      privateKey: u8aToHex(decoded.secretKey),
      publicKey: u8aToHex(decoded.publicKey)
    };
  }
}
