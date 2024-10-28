// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { RawTransactionConfig, TxBatch } from '@subwallet/extension-base/types';

export const splitTransactionsBatches = (txs: RawTransactionConfig[]): TxBatch[] => {
  const txBatch: TxBatch[] = [];
  let currentTxBatch: TxBatch | undefined;

  for (const tx of txs) {
    if (!currentTxBatch) {
      currentTxBatch = {
        chainId: tx.chainId,
        txs: [tx]
      };
    } else if (currentTxBatch.chainId === tx.chainId) {
      currentTxBatch.txs.push(tx);
    } else {
      txBatch.push(currentTxBatch);

      currentTxBatch = {
        chainId: tx.chainId,
        txs: [tx]
      };
    }
  }

  if (currentTxBatch) {
    txBatch.push(currentTxBatch);
  }

  return txBatch;
};
