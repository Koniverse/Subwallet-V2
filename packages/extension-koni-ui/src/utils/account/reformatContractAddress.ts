// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {isEthereumAddress} from "@polkadot/util-crypto";
import {reformatAddress} from "@subwallet/extension-koni-ui/utils";

const SPECIAL_CHAIN = ['rootstock'];

export function reformatContractAddress (chainSlug: string, contractAddress: string) {
  if (SPECIAL_CHAIN.includes(chainSlug) && isEthereumAddress(contractAddress.toLowerCase())) {
    return reformatAddress(contractAddress.toLowerCase());
  }

  return contractAddress;
}
