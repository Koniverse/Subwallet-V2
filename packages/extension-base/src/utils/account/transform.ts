// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import { ALL_ACCOUNT_KEY } from '@subwallet/extension-base/constants';
import { AccountJson, AccountMetadataData, AccountNetworkType, AccountProxy, AccountProxyMap, AccountProxyStoreData, AccountProxyType, AccountSignMode, AddressJson, ModifyPairStoreData } from '@subwallet/extension-base/types';
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

  if (!address) {
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

export const transformAccount = (address: string, _type?: KeypairType, meta?: KeyringPair$Meta): AccountJson => {
  const accountActions: string[] = [];
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

  return {
    address,
    ...meta,
    type,
    accountActions,
    transactionActions,
    signMode,
    networkType
  };
};

export const singleAddressToAccount = ({ json: { address, meta }, type }: SingleAddress): AccountJson => transformAccount(address, type, meta);

export const pairToAccount = ({ address, meta, type }: KeyringPair): AccountJson => transformAccount(address, type, meta);

export const transformAccounts = (accounts: SubjectInfo): AccountJson[] => Object.values(accounts).map(singleAddressToAccount);

export const transformAddress = (address: string, meta?: KeyringPair$Meta): AddressJson => {
  return {
    address,
    ...meta
  };
};

export const transformAddresses = (addresses: SubjectInfo): AddressJson[] => Object.values(addresses).map(({ json: { address, meta } }) => transformAddress(address, meta));

export const combineAccounts = (pairs: SubjectInfo, modifyPairs: ModifyPairStoreData, accountProxies: AccountProxyStoreData) => {
  const temp: Record<string, Omit<AccountProxy, 'accountType'>> = {};

  for (const [address, pair] of Object.entries(pairs)) {
    const modifyPair = modifyPairs[address];
    const account: AccountJson = singleAddressToAccount(pair);

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

        if (value.accounts.length > 1) {
          accountType = AccountProxyType.UNIFIED;
          networkTypes = Array.from(value.accounts.reduce<Set<AccountNetworkType>>((rs, account) => rs.add(account.networkType), new Set()));
        } else if (value.accounts.length === 1) {
          const account = value.accounts[0];

          networkTypes = [account.networkType];

          if (account.isInjected) {
            accountType = AccountProxyType.INJECTED;
          } else if (account.isExternal) {
            if (account.isHardware) {
              accountType = AccountProxyType.LEDGER;
            } else if (account.isReadOnly) {
              accountType = AccountProxyType.READ_ONLY;
            } else {
              accountType = AccountProxyType.QR;
            }
          } else {
            accountType = AccountProxyType.SOLO;
          }
        }

        return [key, { ...value, accountType, networkTypes }];
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
