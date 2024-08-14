// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ALL_ACCOUNT_KEY } from '@subwallet/extension-base/constants';
import { decodeAddress, encodeAddress, getKeypairTypeByAddress, isAddress, isBitcoinAddress, isTonAddress } from '@subwallet/keyring';
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

export function categoryAddresses (addresses: string[]): {
  substrate: string[],
  evm: string[],
  ton: string[],
  bitcoin: string[]
} {
  const substrate: string[] = [];
  const evm: string[] = [];
  const ton: string[] = [];
  const bitcoin: string[] = [];

  addresses.forEach((address) => {
    if (isEthereumAddress(address)) {
      evm.push(address);
    } else if (isTonAddress(address)) {
      ton.push(address);
    } else if (isBitcoinAddress(address)) {
      bitcoin.push(address);
    } else {
      substrate.push(address);
    }
  });

  return {
    bitcoin,
    evm,
    substrate,
    ton
  };
}

export function quickFormatAddressToCompare (address?: string) {
  if (!isAddress(address)) {
    return address;
  }

  return reformatAddress(address, 42).toLowerCase();
}

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
