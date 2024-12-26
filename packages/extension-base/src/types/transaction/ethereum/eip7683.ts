// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { HexString } from "@polkadot/util/types";

export interface RequestEIP7683 {
  sourceChainId: number;
  targetChainId: number;
  sourceAddress: HexString;
  targetAddress: HexString;
  sourceToken: HexString;
  targetToken: HexString;
  amount: HexString;
}

export interface EIP7683Step {
  key: string;
  title: string;
  description: string;
  metadata: unknown;
}

export interface EIP7683Data extends RequestEIP7683 {
  steps: EIP7683Step[];
}
