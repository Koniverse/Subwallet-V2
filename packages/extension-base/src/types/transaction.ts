// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { ChainType, ExtrinsicDataTypeMap, ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import { TransactionConfig } from 'web3-core';

import { SubmittableExtrinsic } from '@polkadot/api/types';

export interface SwTransactionMetadata {
  chainType: ChainType;
  data: ExtrinsicDataTypeMap[ExtrinsicType];
  extrinsicType: ExtrinsicType;
}

export type TransactionData = SubmittableExtrinsic<'promise'> | TransactionConfig;
export type TransactionDataPromise = (id: string, metadata: SwTransactionMetadata) => Promise<string | Error>;
export type TransactionDataWithCustom = TransactionData | TransactionDataPromise;

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
