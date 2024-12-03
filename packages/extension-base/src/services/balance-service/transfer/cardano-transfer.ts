// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

// todo: interface CardanoTransactionProps
import { _ChainAsset } from '@subwallet/chain-list/types';
import { estimateCardanoTxFee } from '@subwallet/extension-base/services/balance-service/helpers/subscribe/cardano/utils';
import { _CardanoApi } from '@subwallet/extension-base/services/chain-service/types';

interface CardanoTransactionConfigProps {
  tokenInfo: _ChainAsset;
  from: string,
  to: string,
  networkKey: string,
  value: string,
  transferAll: boolean,
  cardanoTtlOffset: number,
  cardanoApi: _CardanoApi
}

export interface CardanoTransactionConfig {
  from: string,
  to: string,
  networkKey: string,
  value: string,
  transferAll: boolean,
  cardanoTtlOffset: number,
  estimateCardanoFee: string,
  cardanoPayload: string // hex unsigned tx
}

// todo: await built tx, use assetType to check
// eslint-disable-next-line @typescript-eslint/require-await
export async function createCardanoTransaction (params: CardanoTransactionConfigProps): Promise<[CardanoTransactionConfig | null, string]> {
  const { cardanoTtlOffset, from, networkKey, to, transferAll, value } = params;

  // const payload = await getPayload(sender, receiver, amount, policyId) || ''
  const payload = '84a300d9010281825820125c1c772a98554b237fa63342f8cb0dde0e2a213c9180848efb2a9156a748ec01018282583900ad2b3ac4e3017adfb3cbb04c5ca7a678204daaac96accab6690010dc7ab98b3e995e211b8615b2466d3a93ec069e9d60f17cd1ef3434ea54821a0012dfeaa1581c3d64987c567150b011edeed959cd1293432b7f2bc228982e2be395f7a1530014df10426c7565646f742043617264616e6f1b00013e52b9abe00082583900e33b8297e1ce697e07b12de2bc781280bac7b9c949c6194894e9b82132761cf8ea1eeb6628a4fc4fcf4470d6b8a38632a298d84f0c5b63c0821b000000014f9b08c8a1581c3d64987c567150b011edeed959cd1293432b7f2bc228982e2be395f7a1530014df10426c7565646f742043617264616e6f1b0ddf7860dbd67d00021a0002a6cda0f5f6';
  const fee = estimateCardanoTxFee(payload);

  const tx: CardanoTransactionConfig = {
    from,
    to,
    networkKey,
    value,
    transferAll,
    cardanoTtlOffset,
    estimateCardanoFee: fee,
    cardanoPayload: payload
  };

  return [tx, value];
}
