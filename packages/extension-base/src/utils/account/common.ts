// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainInfo } from '@subwallet/chain-list/types';
import { ChainType } from '@subwallet/extension-base/background/KoniTypes';
import { ALL_ACCOUNT_KEY } from '@subwallet/extension-base/constants';
import { _chainInfoToChainType, _getChainSubstrateAddressPrefix } from '@subwallet/extension-base/services/chain-service/utils';
import { AccountChainType } from '@subwallet/extension-base/types';
import { getAccountChainTypeFromKeypairType } from '@subwallet/extension-base/utils';
import { decodeAddress, encodeAddress, getKeypairTypeByAddress, isAddress, isBitcoinAddress, isCardanoAddress, isTonAddress } from '@subwallet/keyring';
import { KeypairType } from '@subwallet/keyring/types';

import { ethereumEncode, isEthereumAddress } from '@polkadot/util-crypto';

export function isAccountAll (address?: string): boolean {
  return address === ALL_ACCOUNT_KEY;
}

export function reformatAddress (address: string, networkPrefix = 42, isEthereum = false): string {
  try {
    if (!address || address === '') {
      return '';
    }

    if (isEthereumAddress(address)) {
      return address;
    }

    if (isAccountAll(address)) {
      return address;
    }

    const publicKey = decodeAddress(address);

    if (isEthereum) {
      return ethereumEncode(publicKey);
    }

    const type: KeypairType = getKeypairTypeByAddress(address);

    if (networkPrefix < 0) {
      return address;
    }

    return encodeAddress(publicKey, networkPrefix, type);
  } catch (e) {
    console.warn('Get error while reformat address', address, e);

    return address;
  }
}

export const _reformatAddressWithChain = (address: string, chainInfo: _ChainInfo): string => { // todo: check for cardano
  const chainType = _chainInfoToChainType(chainInfo);

  if (chainType === AccountChainType.SUBSTRATE) {
    return reformatAddress(address, _getChainSubstrateAddressPrefix(chainInfo));
  } else if (chainType === AccountChainType.TON || chainType === AccountChainType.CARDANO) {
    const isTestnet = chainInfo.isTestnet;

    return reformatAddress(address, isTestnet ? 0 : 1);
  } else {
    return address;
  }
};

export const getAccountChainTypeForAddress = (address: string): AccountChainType => {
  const type = getKeypairTypeByAddress(address);

  return getAccountChainTypeFromKeypairType(type);
};

interface AddressesByChainType {
  [ChainType.SUBSTRATE]: string[],
  [ChainType.EVM]: string[],
  [ChainType.BITCOIN]: string[],
  [ChainType.TON]: string[],
  [ChainType.CARDANO]: string[]
}

export function getAddressesByChainType (addresses: string[], chainTypes: ChainType[]): string[] {
  const addressByChainTypeMap = getAddressesByChainTypeMap(addresses);

  return chainTypes.map((chainType) => {
    return addressByChainTypeMap[chainType];
  }).flat(); // todo: recheck
}

export function getAddressesByChainTypeMap (addresses: string[]): AddressesByChainType {
  const addressByChainType: AddressesByChainType = {
    substrate: [],
    evm: [],
    bitcoin: [],
    ton: [],
    cardano: []
  };

  addresses.forEach((address) => {
    if (isEthereumAddress(address)) {
      addressByChainType.evm.push(address);
    } else if (isTonAddress(address)) {
      addressByChainType.ton.push(address);
    } else if (isBitcoinAddress(address)) {
      addressByChainType.bitcoin.push(address);
    } else if (isCardanoAddress(address)) {
      addressByChainType.cardano.push(address);
    } else {
      addressByChainType.substrate.push(address);
    }
  });

  return addressByChainType;
}

export function quickFormatAddressToCompare (address?: string) {
  if (!isAddress(address)) {
    return address;
  }

  return reformatAddress(address, 42).toLowerCase();
}

/** @deprecated */
export const modifyAccountName = (type: KeypairType, name: string, modify: boolean) => {
  if (!modify) {
    return name;
  }

  let network = '';

  switch (type) {
    case 'sr25519':
    case 'ed25519':
    case 'ecdsa':
      network = 'Substrate';
      break;
    case 'ethereum':
      network = 'EVM';
      break;
    case 'ton':
    case 'ton-native':
      network = 'Ton';
      break;
  }

  return network ? [name, network].join(' - ') : name;
};
