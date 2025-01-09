// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import * as csl from '@emurgo/cardano-serialization-lib-nodejs';
import { _AssetType, _ChainAsset } from '@subwallet/chain-list/types';
import { fetchUnsignedPayload } from '@subwallet/extension-base/services/backend-controller/cardano';
import { CardanoTxJson, CardanoTxOutput } from '@subwallet/extension-base/services/balance-service/helpers/subscribe/cardano/types';
import { CardanoAssetMetadata, estimateCardanoTxFee, splitCardanoId } from '@subwallet/extension-base/services/balance-service/helpers/subscribe/cardano/utils';
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
  const assetType = params.tokenInfo.assetType;
  const isSendSameAddress = params.from === params.to;

  if (!cardanoId) {
    throw new Error('Missing cardano id metadata');
  }

  const cardanoAssetMetadata = splitCardanoId(cardanoId);

  if (isSendSameAddress) {
    validateAllOutputsBelongToAddress(params.from, outputs);
    validateExistOutputWithAmountSend(params.value, outputs, assetType, cardanoAssetMetadata);
  } else {
    const [outputsBelongToReceiver, outputsNotBelongToReceiver] = [
      outputs.filter((output) => output.address === params.to),
      outputs.filter((output) => output.address !== params.to)
    ];

    validateReceiverOutputsWithAmountSend(params.value, outputsBelongToReceiver, assetType, cardanoAssetMetadata);
    validateAllOutputsBelongToAddress(params.from, outputsNotBelongToReceiver);
  }
}

function validateAllOutputsBelongToAddress (address: string, outputs: CardanoTxOutput[]) {
  for (const output of outputs) {
    if (output.address !== address) {
      throw new Error('Transaction has invalid address information');
    }
  }
}

function validateExistOutputWithAmountSend (amount: string, outputs: CardanoTxOutput[], assetType: _AssetType, cardanoAssetMetadata: CardanoAssetMetadata) {
  if (assetType === _AssetType.NATIVE) {
    for (const output of outputs) {
      if (output.amount.coin === amount) {
        return;
      }
    }

    throw new Error('Transaction has invalid transfer amount information');
  }

  if (assetType === _AssetType.CIP26) {
    for (const output of outputs) {
      if (amount === output.amount.multiasset[cardanoAssetMetadata.policyId][cardanoAssetMetadata.nameHex]) {
        return;
      }
    }

    throw new Error('Transaction has invalid transfer amount information');
  }

  throw new Error('AssetType is invalid');
}

function validateReceiverOutputsWithAmountSend (amount: string, outputs: CardanoTxOutput[], assetType: _AssetType, cardanoAssetMetadata: CardanoAssetMetadata) {
  if (outputs.length !== 1) {
    throw new Error('Transaction has invalid transfer amount information');
  }

  const receiverOutput = outputs[0];

  if (assetType === _AssetType.NATIVE) {
    if (receiverOutput.amount.coin === amount) {
      return;
    }

    throw new Error('Transaction has invalid transfer amount information');
  }

  if (assetType === _AssetType.CIP26) {
    if (receiverOutput.amount.multiasset[cardanoAssetMetadata.policyId][cardanoAssetMetadata.nameHex] === amount) {
      return;
    }

    throw new Error('Transaction has invalid transfer amount information');
  }

  throw new Error('AssetType is invalid');
}
