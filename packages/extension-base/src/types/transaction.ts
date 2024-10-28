// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { UserOpBundle } from '@particle-network/aa';
import { QuoteResponse } from 'klaster-sdk';
import { TransactionConfig } from 'web3-core';

import { SubmittableExtrinsic } from '@polkadot/api/types';

export type TransactionData = SubmittableExtrinsic<'promise'> | TransactionConfig;

export interface RawTransactionConfig {
  to: string;
  gas: number | string;
  value?: number | string;
  data?: string;
  chainId: number;
}

export type AATransaction = UserOpBundle | QuoteResponse | TransactionConfig;

export interface TxBatch {
  txs: RawTransactionConfig[];
  chainId: number;
}
