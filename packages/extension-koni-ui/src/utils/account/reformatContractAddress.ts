// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { reformatAddress } from '@subwallet/extension-koni-ui/utils';

import { isEthereumAddress } from '@polkadot/util-crypto';

const SPECIAL_CHAIN = ['rootstock'];

export function reformatContractAddress (chainSlug: string, contractAddress: string) {
  if (SPECIAL_CHAIN.includes(chainSlug) && isEthereumAddress(contractAddress.toLowerCase())) {
    return reformatAddress(contractAddress.toLowerCase());
  }

  return contractAddress;
}
