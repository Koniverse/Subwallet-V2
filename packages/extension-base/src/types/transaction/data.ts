// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { TransactionConfig } from 'web3-core';

import { SubmittableExtrinsic } from '@polkadot/api/types';

export type TransactionData = SubmittableExtrinsic<'promise'> | TransactionConfig;

export interface Web3TransactionBase {
  to?: string;
  gasPrice: number;
  maxFeePerGas: number;
  maxPriorityFeePerGas: number;
  gasLimit: number;
  nonce: number;
  chainId: number;
  data?: string;
  value: number;
}

export interface Web3Transaction extends Web3TransactionBase {
  from: string;
}
