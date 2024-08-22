// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { ALL_ACCOUNT_KEY } from '@subwallet/extension-base/constants';
import { AccountProxy, AccountProxyStoreData, KeyringPairs$JsonV2, ModifyPairStoreData, RequestAccountBatchExportV2, RequestBatchJsonGetAccountInfo, RequestBatchRestoreV2, RequestJsonGetAccountInfo, RequestJsonRestoreV2, ResponseAccountBatchExportV2, ResponseBatchJsonGetAccountInfo, ResponseJsonGetAccountInfo } from '@subwallet/extension-base/types';
import { combineAccountsWithKeyPair, convertAccountProxyType, transformAccount } from '@subwallet/extension-base/utils';
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

  public parseInfoSingleJson ({ json, password }: RequestJsonGetAccountInfo): ResponseJsonGetAccountInfo {
    const isPasswordValidated = this.validatePassword(json, password);

    if (isPasswordValidated) {
      try {
        const { address, meta, type } = keyring.createFromJson(json);
        const account = transformAccount(address, type, meta);
        const proxy: AccountProxy = {
          id: address,
          accountType: convertAccountProxyType(account.signMode),
          name: account.name || account.address,
          accounts: [account],
          chainTypes: [account.chainType],
          parentId: account.parentAddress,
          suri: account.suri,
          tokenTypes: account.tokenTypes,
          accountActions: []
        };

        return {
          accountProxy: proxy
        };
      } catch (e) {
        console.error(e);
        throw new Error((e as Error).message);
      }
    } else {
      throw new Error(t('Wrong password'));
    }
  }

  public jsonRestoreV2 ({ address, file, isAllowed, password, withMasterPassword }: RequestJsonRestoreV2): void {
    const isPasswordValidated = this.validatePassword(file, password);

    if (isPasswordValidated) {
      try {
        keyring.restoreAccount(file, password, withMasterPassword);

        this.state.saveCurrentAccountProxyId(address, () => {
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

  private validatedAccountsPassword (json: EncryptedJson, password: string): KeyringPair$Json[] | null {
    try {
      const decoded = u8aToString(jsonDecrypt(json, password));

      return JSON.parse(decoded) as KeyringPair$Json[];
    } catch (e) {
      return null;
    }
  }

  public parseInfoMultiJson ({ json, password }: RequestBatchJsonGetAccountInfo): ResponseBatchJsonGetAccountInfo {
    const jsons = this.validatedAccountsPassword(json, password);

    if (jsons) {
      try {
        const { accountProxies, modifyPairs } = json;
        const pairs = jsons.map((pair) => keyring.createFromJson(pair));
        const accountProxyMap = combineAccountsWithKeyPair(pairs, modifyPairs, accountProxies);
        const result = Object.values(accountProxyMap);

        return {
          accountProxies: result
        };
      } catch (e) {
        console.error(e);
        throw new Error((e as Error).message);
      }
    } else {
      throw new Error(t('Wrong password'));
    }
  }

  public batchRestoreV2 ({ file, isAllowed, password, proxyIds: _proxyIds }: RequestBatchRestoreV2): void {
    const jsons = this.validatedAccountsPassword(file, password);

    if (jsons) {
      try {
        const { accountProxies, modifyPairs } = file;
        const pairs = jsons.map((pair) => keyring.createFromJson(pair));
        const accountProxyMap = combineAccountsWithKeyPair(pairs, modifyPairs, accountProxies);
        const rawProxyIds = _proxyIds && _proxyIds.length ? _proxyIds : Object.keys(accountProxyMap);

        const filteredAccountProxies = Object.fromEntries(Object.entries(accountProxyMap)
          .filter(([key, value]) => {
            if (!rawProxyIds.includes(key)) {
              return false;
            }

            const addresses = value.accounts.map((account) => account.address);
            const exists = this.state.checkAddressExists(addresses);

            return !exists;
          })
        );

        const addresses = Object.values(filteredAccountProxies).flatMap((proxy) => proxy.accounts.map((account) => account.address));
        const proxyIds = Object.values(filteredAccountProxies).flatMap((proxy) => proxy.id);

        const _accountProxies = this.state.value.accountProxy;
        const _modifyPairs = this.state.value.modifyPair;
        const currentProxyId = this.state.value.currentAccount.proxyId;

        const nextAccountProxyId = !proxyIds.length
          ? currentProxyId
          : proxyIds.length === 1
            ? proxyIds[0]
            : ALL_ACCOUNT_KEY;

        if (accountProxies) {
          for (const proxyId of proxyIds) {
            if (accountProxies[proxyId]) {
              _accountProxies[proxyId] = accountProxies[proxyId];
            }
          }
        }

        if (modifyPairs) {
          for (const [key, modifyPair] of Object.entries(modifyPairs)) {
            if (proxyIds.includes(modifyPair.accountProxyId || '')) {
              _modifyPairs[key] = modifyPair;
            }
          }
        }

        this.state.upsertAccountProxy(_accountProxies);
        this.state.upsertModifyPairs(_modifyPairs);

        keyring.restoreAccounts(file, password, addresses);

        this.state.saveCurrentAccountProxyId(nextAccountProxyId, () => {
          this.state.updateMetadataForPair();
          this.state._addAddressesToAuthList(addresses, isAllowed);
        });
      } catch (error) {
        throw new Error((error as Error).message);
      }
    } else {
      throw new Error(t('Wrong password'));
    }
  }

  public async batchExportV2 (request: RequestAccountBatchExportV2): Promise<ResponseAccountBatchExportV2> {
    const { password, proxyIds } = request;

    try {
      if (proxyIds && !proxyIds.length) {
        throw new Error(t('No accounts found to export'));
      }

      const _accountProxy = this.state.value.accountProxy;
      const _modifyPair = this.state.value.modifyPair;
      const _account = this.state.value.accounts;
      const _proxyIds = proxyIds || Object.keys(_account);
      const modifyPairs: ModifyPairStoreData = Object.fromEntries(Object.entries(_modifyPair).filter(([, modifyPair]) => _proxyIds.includes(modifyPair.accountProxyId || '')));
      const accountProxies: AccountProxyStoreData = Object.fromEntries(Object.entries(_accountProxy).filter(([, proxy]) => _proxyIds.includes(proxy.id)));
      const addresses = Object.values(_account).filter((account) => _proxyIds.includes(account.id)).flatMap((proxy) => proxy.accounts.map((account) => account.address));
      const rs: KeyringPairs$JsonV2 = await keyring.backupAccounts(password, addresses);

      if (Object.keys(modifyPairs).length && Object.keys(accountProxies).length) {
        rs.accountProxies = accountProxies;
        rs.modifyPairs = modifyPairs;
      }

      return {
        exportedJson: rs
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
