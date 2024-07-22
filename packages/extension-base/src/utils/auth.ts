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
