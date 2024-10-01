// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { ALL_ACCOUNT_KEY } from '@subwallet/extension-base/constants';
import { AccountProxyExtra, AccountProxyStoreData, KeyringPairs$JsonV2, ModifyPairStoreData, RequestAccountBatchExportV2, RequestBatchJsonGetAccountInfo, RequestBatchRestoreV2, RequestJsonGetAccountInfo, RequestJsonRestoreV2, ResponseAccountBatchExportV2, ResponseBatchJsonGetAccountInfo, ResponseJsonGetAccountInfo } from '@subwallet/extension-base/types';
import { combineAccountsWithKeyPair, convertAccountProxyType, createPromiseHandler, transformAccount } from '@subwallet/extension-base/utils';
import { generateRandomString } from '@subwallet/extension-base/utils/getId';
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
        const { name } = meta;
        const account = transformAccount(address, type, meta);
        const accountExists = this.state.checkAddressExists([address]);
        const nameExists = this.state.checkNameExists(name as string);
        // Note: Show accountName of account exists to support user to know which account is existed
        const accountName = accountExists ? accountExists.name : account.name || account.address;

        const proxy: AccountProxyExtra = {
          id: address,
          accountType: convertAccountProxyType(account.signMode),
          name: accountName,
          accounts: [account],
          chainTypes: [account.chainType],
          parentId: account.parentAddress,
          suri: account.suri,
          tokenTypes: account.tokenTypes,
          accountActions: [],
          isExistAccount: !!accountExists,
          isExistName: nameExists
        };

        return {
          accountProxy: proxy
        };
      } catch (e) {
        console.error(e);
        throw new Error((e as Error).message);
      }
    } else {
      throw new Error(t('Incorrect password'));
    }
  }

  public jsonRestoreV2 ({ address, file, isAllowed, password, withMasterPassword }: RequestJsonRestoreV2, onDone: VoidFunction): Promise<string[]> {
    const isPasswordValidated = this.validatePassword(file, password);
    const { promise, reject, resolve } = createPromiseHandler<string[]>();

    if (isPasswordValidated) {
      try {
        const _pair = keyring.createFromJson(file);
        const exists = this.state.checkAddressExists([_pair.address]);

        assert(!exists, t('Account already exists under the name {{name}}', { replace: { name: exists?.name || exists?.address || _pair.address } }));

        keyring.restoreAccount(file, password, withMasterPassword);

        const pair = keyring.getPair(_pair.address);
        const _name = pair.meta.name as string || '';

        const nameExists = this.state.checkNameExists(_name);

        if (nameExists) {
          const newName = _name.concat(' - ').concat(generateRandomString());

          keyring.saveAccountMeta(pair, { ...pair.meta, name: newName });
        }

        this.state.saveCurrentAccountProxyId(address, () => {
          this.state.updateMetadataForPair();
          this.state._addAddressToAuthList(address, isAllowed);
          resolve([address]);
          onDone();
        });
      } catch (error) {
        reject(error);
      }
    } else {
      reject(new Error(t('Incorrect password')));
    }

    return promise;
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

        const result = Object.values(accountProxyMap).map((proxy): AccountProxyExtra => {
          const rs: AccountProxyExtra = {
            ...proxy,
            isExistAccount: false,
            isExistName: false
          };

          const accountExists = this.state.checkAddressExists(proxy.accounts.map((account) => account.address));
          const nameExists = this.state.checkNameExists(proxy.name);

          rs.isExistAccount = !!accountExists;
          rs.isExistName = nameExists;
          rs.name = accountExists ? accountExists.name : proxy.name;

          return rs;
        });

        return {
          accountProxies: result
        };
      } catch (e) {
        console.error(e);
        throw new Error((e as Error).message);
      }
    } else {
      throw new Error(t('Incorrect password'));
    }
  }

  public batchRestoreV2 ({ file, isAllowed, password, proxyIds: _proxyIds }: RequestBatchRestoreV2): Promise<string[]> {
    const jsons = this.validatedAccountsPassword(file, password);
    const { promise, reject, resolve } = createPromiseHandler<string[]>();

    if (jsons) {
      try {
        const { accountProxies, modifyPairs } = file;
        const pairs = jsons.map((pair) => keyring.createFromJson(pair));
        const accountProxyMap = combineAccountsWithKeyPair(pairs, modifyPairs, accountProxies);
        const rawProxyIds = _proxyIds && _proxyIds.length ? _proxyIds : Object.keys(accountProxyMap);
        let _exists: { address: string; name: string; } | undefined;
        const proxiesChangeName: Record<string, string> = {};
        const accountNameDuplicates = this.state.getDuplicateAccountNames(Object.values(accountProxyMap).filter(({ id }) => rawProxyIds.includes(id)));

        const filteredAccountProxies = Object.fromEntries(Object.entries(accountProxyMap)
          .filter(([proxyId, accountProxy]) => {
            if (!rawProxyIds.includes(proxyId)) {
              return false;
            }

            const addresses = accountProxy.accounts.map((account) => account.address);
            const exists = this.state.checkAddressExists(addresses);
            const name = accountProxy.name;

            if (this.state.checkNameExists(name) || accountNameDuplicates.includes(name)) {
              proxiesChangeName[proxyId] = name.concat(' - ').concat(generateRandomString());
            }

            _exists = exists;

            return !exists;
          })
        );

        const addresses = Object.values(filteredAccountProxies).flatMap((proxy) => proxy.accounts.map((account) => account.address));
        const proxyIds = Object.values(filteredAccountProxies).flatMap((proxy) => proxy.id);

        if (!addresses.length) {
          if (_exists) {
            throw new Error(t('Account already exists under the name {{name}}', { replace: { name: _exists.name || _exists.address || '' } }));
          } else {
            throw new Error(t('No accounts found to import'));
          }
        }

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
            const accountProxy = accountProxies[proxyId];

            if (accountProxy) {
              if (proxiesChangeName[proxyId]) {
                accountProxy.name = proxiesChangeName[proxyId];
              }

              _accountProxies[proxyId] = accountProxy;
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

        for (const [proxyId, accountProxy] of Object.entries(accountProxyMap)) {
          const name = proxiesChangeName[proxyId];

          if (name) {
            for (const account of accountProxy.accounts) {
              const pair = keyring.getPair(account.address);

              keyring.saveAccountMeta(pair, { ...pair.meta, name });
            }
          }
        }

        const successAddressList = addresses.reduce<string[]>((rs, address) => {
          try {
            const account = keyring.getPair(address);

            if (account) {
              rs.push(address);
            }
          } catch (error) {
            console.log(error);
          }

          return rs;
        }, []);

        this.state.saveCurrentAccountProxyId(nextAccountProxyId, () => {
          this.state.updateMetadataForPair();
          this.state._addAddressesToAuthList(addresses, isAllowed);
          resolve(successAddressList);
        });
      } catch (error) {
        throw new Error((error as Error).message);
      }
    } else {
      reject(new Error(t('Incorrect password')));
    }

    return promise;
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
        throw new Error(t('Incorrect password'));
      } else {
        throw error;
      }
    }
  }
}
