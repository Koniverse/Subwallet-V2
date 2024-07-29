// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { reformatAddress } from '@subwallet/extension-base/utils';
import { KeypairType } from '@subwallet/keyring/types';

import { decodeAddress, encodeAddress, isAddress, isEthereumAddress } from '@polkadot/util-crypto';

export const simpleAddress = (address: string): string => {
  if (isEthereumAddress(address)) {
    return address;
  }

  return encodeAddress(decodeAddress(address));
};

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
    case 'ton-special':
      network = 'Ton';
      break;
  }

  return network ? [name, network].join(' - ') : name;
};
