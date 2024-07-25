// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountAuthType } from '@subwallet/extension-base/background/types';

import { isEthereumAddress } from '@polkadot/util-crypto';

export const isAddressValidWithAuthType = (address: string, accountAuthType?: AccountAuthType): boolean => {
  if (accountAuthType === 'substrate') {
    return !isEthereumAddress(address);
  } else if (accountAuthType === 'evm') {
    return isEthereumAddress(address);
  }

  return true;
};

// export const isAddressValidWithAuthType = (address: string, accountAuthType?: AccountAuthType): boolean => {
//   const keypairType = getKeypairTypeByAddress(address);
//
//   if (!['ethereum', 'bitcoin-84', 'bitcoin-86', 'bittest-84', 'bittest-86'].includes(keypairType)) {
//     return false;
//   }
//
//   if (accountAuthType === 'both') {
//     return true;
//   }
//
//   if (accountAuthType === 'evm') {
//     return keypairType === 'ethereum';
//   }
//
//   if (accountAuthType === 'bitcoin') {
//     return ['bitcoin-86', 'bittest-86', 'bitcoin-84', 'bittest-84'].includes(keypairType);
//   }
//
//   return false;
// };
