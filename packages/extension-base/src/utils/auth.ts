// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountAuthType } from '@subwallet/extension-base/background/types';
import { getKeypairTypeByAddress } from '@subwallet/keyring';
import { EthereumKeypairTypes, SubstrateKeypairTypes, TonKeypairTypes } from '@subwallet/keyring/types';

export const isAddressValidWithAuthType = (address: string, accountAuthTypes?: AccountAuthType[]): boolean => {
  const keypairType = getKeypairTypeByAddress(address);

  const validTypes = {
    evm: EthereumKeypairTypes,
    substrate: SubstrateKeypairTypes,
    ton: TonKeypairTypes
  };

  return !!accountAuthTypes?.some((authType) => validTypes[authType]?.includes(keypairType));
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
