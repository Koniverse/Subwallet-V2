// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import * as csl from '@emurgo/cardano-serialization-lib-nodejs';
import { _AssetType, _ChainAsset } from '@subwallet/chain-list/types';
import { fetchUnsignedPayload } from '@subwallet/extension-base/services/backend-controller/cardano';
import { estimateCardanoTxFee, splitCardanoId } from '@subwallet/extension-base/services/balance-service/helpers/subscribe/cardano/utils';
import { _CardanoApi } from '@subwallet/extension-base/services/chain-service/types';

export interface CardanoTransactionConfigProps {
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

export interface CardanoTxJson {
  body: {
    inputs: CardanoTxInput[],
    outputs: CardanoTxOutput[],
    fee: string,
    ttl: string
  }
  witness_set: any,
  is_valid: any,
  auxiliary_data: any
}

interface CardanoTxOutput {
  address: string,
  amount: {
    coin: string,
    multiasset: Record<string, Record<string, string>>;
  }
}

interface CardanoTxInput {
  transaction_id: string,
  index: number
}

export async function createCardanoTransaction (params: CardanoTransactionConfigProps): Promise<[CardanoTransactionConfig | null, string]> {
  const { cardanoTtlOffset, from, networkKey, to, transferAll, value } = params;

  const payload = await fetchUnsignedPayload(params);

  console.log('Build cardano payload successfully!', payload);

  validatePayload(payload, params);

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

function validatePayload (payload: string, params: CardanoTransactionConfigProps) {
  const txInfo = JSON.parse(csl.Transaction.from_hex(payload).to_json()) as CardanoTxJson;
  const outputs = txInfo.body.outputs;
  const cardanoId = params.tokenInfo.metadata?.cardanoId;
  let receiverAmount = 0;

  if (!cardanoId) {
    throw new Error('Missing token policy id metadata');
  }

  for (const output of outputs) {
    if (output.address !== params.to && output.address !== params.from) {
      throw new Error('Transaction has invalid address information');
    }

    if (params.tokenInfo.assetType === _AssetType.NATIVE && output.address === params.to) {
      receiverAmount = receiverAmount + parseInt(output.amount.coin);
    }

    if (params.tokenInfo.assetType === _AssetType.CIP26 && output.address === params.to) {
      const { nameHex, policyId } = splitCardanoId(cardanoId);

      receiverAmount = receiverAmount + parseInt(output.amount.multiasset[policyId][nameHex]);
    }
  }

  if (receiverAmount.toString() !== params.value) {
    throw new Error('Transaction has invalid transfer amount information');
  }
}
