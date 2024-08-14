// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainInfo } from '@subwallet/chain-list/types';
import { ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import { ALL_ACCOUNT_KEY } from '@subwallet/extension-base/constants';
import { _getSubstrateGenesisHash } from '@subwallet/extension-base/services/chain-service/utils';
import { AccountActions, AccountJson, AccountMetadataData, AccountNetworkType, AccountProxy, AccountProxyMap, AccountProxyStoreData, AccountProxyType, AccountSignMode, AddressJson, ModifyPairStoreData } from '@subwallet/extension-base/types';
import { getKeypairTypeByAddress } from '@subwallet/keyring';
import { BitcoinKeypairTypes, EthereumKeypairTypes, KeypairType, KeyringPair, KeyringPair$Meta, TonKeypairTypes } from '@subwallet/keyring/types';
import { SingleAddress, SubjectInfo } from '@subwallet/ui-keyring/observable/types';

import { hexStripPrefix, u8aToHex } from '@polkadot/util';
import { blake2AsHex, mnemonicToEntropy, mnemonicValidate } from '@polkadot/util-crypto';

export const createAccountProxyId = (_suri: string, derivationPath?: string) => {
  let data: string = _suri;

  if (mnemonicValidate(_suri)) {
    const entropy = mnemonicToEntropy(_suri);

    data = u8aToHex(entropy);

    if (derivationPath) {
      data = blake2AsHex(data, 256);
    }
  }

  if (derivationPath) {
    data = hexStripPrefix(data).concat(derivationPath);
  }

  return blake2AsHex(data, 256);
};

export const getAccountSignMode = (address: string, _meta?: KeyringPair$Meta): AccountSignMode => {
  const meta = _meta as AccountMetadataData;

  if (!address || !meta) {
    return AccountSignMode.UNKNOWN;
  } else {
    if (address === ALL_ACCOUNT_KEY) {
      return AccountSignMode.ALL_ACCOUNT;
    } else {
      if (meta.isInjected) {
        return AccountSignMode.INJECTED;
      }

      if (meta.isExternal) {
        if (meta.isHardware) {
          if (meta.isGeneric) {
            return AccountSignMode.GENERIC_LEDGER;
          } else {
            return AccountSignMode.LEGACY_LEDGER;
          }
        } else if (meta.isReadOnly) {
          return AccountSignMode.READ_ONLY;
        } else {
          return AccountSignMode.QR;
        }
      } else {
        return AccountSignMode.PASSWORD;
      }
    }
  }
};

/**
 * Transforms account data into an `AccountJson` object.
 *
 * @param {string} address - The address of the account.
 * @param {KeypairType} [_type] - The type of the keypair (optional).
 * @param {KeyringPair$Meta} [meta] - Metadata associated with the keyring pair (optional).
 * @param {Record<string, _ChainInfo>} [chainInfoMap] - A map of chain information (optional).
 * If chain information is provided, add full data to account.
 * @returns {AccountJson} The transformed account data.
 *
 * This function performs the following steps:
 * 1. Determines the sign mode of the account based on the address and metadata.
 * 2. Determines the network type of the account based on the keypair type.
 * 3. If chain information is provided, add full data (accountActions, transactionActions) to account.
 * 4. Returns an `AccountJson` object containing the transformed account data.
 */
export const transformAccount = (address: string, _type?: KeypairType, meta?: KeyringPair$Meta, chainInfoMap?: Record<string, _ChainInfo>): AccountJson => {
  const accountActions: AccountActions[] = [];
  const transactionActions: ExtrinsicType[] = [];
  const signMode = getAccountSignMode(address, meta);
  const type = _type || getKeypairTypeByAddress(address);
  const networkType: AccountNetworkType = type
    ? EthereumKeypairTypes.includes(type)
      ? AccountNetworkType.ETHEREUM
      : TonKeypairTypes.includes(type)
        ? AccountNetworkType.TON
        : BitcoinKeypairTypes.includes(type)
          ? AccountNetworkType.BITCOIN
          : AccountNetworkType.SUBSTRATE
    : AccountNetworkType.SUBSTRATE;
  let specialNetworks: string[] | undefined;

  if (!chainInfoMap) {
    return {
      address,
      ...meta,
      type,
      accountActions,
      transactionActions,
      signMode,
      networkType
    };
  }

  const genesisHash = meta?.genesisHash;

  if (chainInfoMap && signMode === AccountSignMode.LEGACY_LEDGER && genesisHash) {
    const chainInfo = Object.values(chainInfoMap).find((info) => _getSubstrateGenesisHash(info) === genesisHash);

    if (chainInfo) {
      specialNetworks = [chainInfo.slug];
    }
  }

  /* Account actions */

  // JSON
  if (signMode === AccountSignMode.PASSWORD) {
    accountActions.push(AccountActions.EXPORT_JSON);
  }

  // Mnemonic
  if (meta) {
    const _meta = meta as AccountMetadataData;

    if (_meta.isMasterAccount) {
      accountActions.push(AccountActions.EXPORT_MNEMONIC);
    }
  }

  // Private key
  if (signMode === AccountSignMode.PASSWORD && networkType === AccountNetworkType.ETHEREUM) {
    accountActions.push(AccountActions.EXPORT_PRIVATE_KEY);
  }

  // QR
  if (signMode === AccountSignMode.PASSWORD && networkType === AccountNetworkType.SUBSTRATE) {
    accountActions.push(AccountActions.EXPORT_QR);
  }

  // Derive
  if (signMode === AccountSignMode.PASSWORD) {
    if (networkType === AccountNetworkType.SUBSTRATE) {
      accountActions.push(AccountActions.DERIVE);
    } else if (type !== 'ton-native') {
      if (meta) {
        const _meta = meta as AccountMetadataData;

        if (_meta.isMasterAccount) {
          accountActions.push(AccountActions.DERIVE);
        }
      }
    }
  }

  /* Account actions */

  return {
    address,
    ...meta,
    type,
    accountActions,
    transactionActions,
    signMode,
    networkType,
    specialNetworks
  };
};

export const singleAddressToAccount = ({ json: { address, meta }, type }: SingleAddress, chainInfoMap?: Record<string, _ChainInfo>): AccountJson => transformAccount(address, type, meta, chainInfoMap);

export const pairToAccount = ({ address, meta, type }: KeyringPair, chainInfoMap?: Record<string, _ChainInfo>): AccountJson => transformAccount(address, type, meta, chainInfoMap);

export const transformAccounts = (accounts: SubjectInfo): AccountJson[] => Object.values(accounts).map((data) => singleAddressToAccount(data));

export const transformAddress = (address: string, meta?: KeyringPair$Meta): AddressJson => {
  return {
    address,
    ...meta
  };
};

export const transformAddresses = (addresses: SubjectInfo): AddressJson[] => Object.values(addresses).map(({ json: { address, meta } }) => transformAddress(address, meta));

export const combineAccounts = (pairs: SubjectInfo, modifyPairs: ModifyPairStoreData, accountProxies: AccountProxyStoreData, chainInfoMap?: Record<string, _ChainInfo>) => {
  const temp: Record<string, Omit<AccountProxy, 'accountType'>> = {};

  for (const [address, pair] of Object.entries(pairs)) {
    const modifyPair = modifyPairs[address];
    const account: AccountJson = singleAddressToAccount(pair, chainInfoMap);

    if (modifyPair && modifyPair.accountProxyId) {
      const accountGroup = accountProxies[modifyPair.accountProxyId];

      if (accountGroup) {
        if (!temp[accountGroup.id]) {
          temp[accountGroup.id] = { ...accountGroup, accounts: [], networkTypes: [] };
        }

        temp[accountGroup.id].accounts.push(account);
        continue;
      }
    }

    temp[address] = {
      id: address,
      name: account.name || account.address,
      accounts: [account],
      networkTypes: [account.networkType],
      parentId: account.parentAddress,
      suri: account.suri
    };
  }

  const result: AccountProxyMap = Object.fromEntries(
    Object.entries(temp)
      .map(([key, value]): [string, AccountProxy] => {
        let accountType: AccountProxyType = AccountProxyType.UNKNOWN;
        let networkTypes: AccountNetworkType[] = [];
        let specialNetworks: string[] | undefined;

        if (value.accounts.length > 1) {
          accountType = AccountProxyType.UNIFIED;
          networkTypes = Array.from(value.accounts.reduce<Set<AccountNetworkType>>((rs, account) => rs.add(account.networkType), new Set()));
        } else if (value.accounts.length === 1) {
          const account = value.accounts[0];

          networkTypes = [account.networkType];

          switch (account.signMode) {
            case AccountSignMode.GENERIC_LEDGER:
            case AccountSignMode.LEGACY_LEDGER:
              accountType = AccountProxyType.LEDGER;
              specialNetworks = account.specialNetworks;
              break;
            case AccountSignMode.QR:
              accountType = AccountProxyType.QR;
              break;
            case AccountSignMode.READ_ONLY:
              accountType = AccountProxyType.READ_ONLY;
              break;
            case AccountSignMode.INJECTED:
              accountType = AccountProxyType.INJECTED;
              break;
            case AccountSignMode.PASSWORD:
              accountType = AccountProxyType.SOLO;
              break;
            case AccountSignMode.ALL_ACCOUNT:
              accountType = AccountProxyType.ALL_ACCOUNT;
              break;
            case AccountSignMode.UNKNOWN:
              accountType = AccountProxyType.UNKNOWN;
              break;
          }
        }

        return [key, { ...value, accountType, networkTypes, specialNetworks }];
      })
  );

  const deepSearchParentId = (parentId: string): string => {
    const parent = result[parentId];

    if (parent && parent.parentId) {
      return deepSearchParentId(parent.parentId);
    }

    return parentId;
  };

  for (const value of Object.values(result)) {
    if (value.parentId) {
      value.parentId = deepSearchParentId(value.parentId);
    }
  }

  const deepSearchChildren = (id: string): string[] => {
    const rs: string[] = [];

    for (const accountProxy of Object.values(result)) {
      if (accountProxy.parentId === id) {
        rs.push(accountProxy.id);
      }
    }

    return rs;
  };

  for (const value of Object.values(result)) {
    value.children = deepSearchChildren(value.id);
  }

  return result;
};
