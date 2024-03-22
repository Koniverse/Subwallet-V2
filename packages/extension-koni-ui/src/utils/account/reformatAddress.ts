// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { isAccountAll } from '@subwallet/extension-koni-ui/utils/account/accountAll';
import { decodeAddress, encodeAddress, getKeypairTypeByAddress } from '@subwallet/keyring';
import { KeypairType } from '@subwallet/keyring/types';

import { ethereumEncode, isEthereumAddress } from '@polkadot/util-crypto';

export default function reformatAddress (address: string, networkPrefix = 42, isEthereum = false): string {
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
