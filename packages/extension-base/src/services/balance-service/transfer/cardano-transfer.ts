// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

// todo: interface CardanoTransactionProps
import { _AssetType, _ChainAsset } from '@subwallet/chain-list/types';
import {
  _isCIP26Token,
  estimateCardanoTxFee
} from '@subwallet/extension-base/services/balance-service/helpers/subscribe/cardano/utils';
import { _CardanoApi } from '@subwallet/extension-base/services/chain-service/types';
import { _isNativeToken } from '@subwallet/extension-base/services/chain-service/utils';

interface CardanoTransactionConfigProps {
  tokenInfo: _ChainAsset;
  from: string,
  to: string,
  networkKey: string,
  value: string,
  transferAll: boolean,
  cardanoApi: _CardanoApi
}

export interface CardanoTransactionConfig {
  from: string,
  to: string,
  networkKey: string,
  value: string,
  transferAll: boolean,
  estimateCardanoFee: string,
  cardanoPayload: string // hex unsigned tx
}

export async function createCardanoTransaction (params: CardanoTransactionConfigProps): Promise<[CardanoTransactionConfig | null, string]> {
  const { tokenInfo, value } = params;
  let tx: CardanoTransactionConfig | null = null;

  if (_isNativeToken(tokenInfo)) {
    tx = await createTransferTransaction(params, _AssetType.NATIVE);
  }

  if (_isCIP26Token(tokenInfo)) {
    tx = await createTransferTransaction(params, _AssetType.CIP26);
  }

  return [tx, value];
}

async function createTransferTransaction (params: CardanoTransactionConfigProps, assetType: _AssetType.NATIVE | _AssetType.CIP26): Promise<CardanoTransactionConfig> {
  // todo: get built tx from server, use assetType to check
  // todo: payload must be string, if no payload => ''
  const payload = '84a300d9010281825820426e4ac6984d31aad7eed7f69106dda830474799ba2c898d5b837ae35db1b12701018282583900ad2b3ac4e3017adfb3cbb04c5ca7a678204daaac96accab6690010dc7ab98b3e995e211b8615b2466d3a93ec069e9d60f17cd1ef3434ea541a08f0d18082583900e33b8297e1ce697e07b12de2bc781280bac7b9c949c6194894e9b82132761cf8ea1eeb6628a4fc4fcf4470d6b8a38632a298d84f0c5b63c01b000000017451b7cf021a0002922da0f5f6';
  const fee = await estimateCardanoTxFee(payload);

  return {
    from: params.from,
    to: params.to,
    networkKey: params.networkKey,
    value: params.value,
    transferAll: params.transferAll,
    estimateCardanoFee: fee,
    cardanoPayload: payload
  };
}

// expected payload: 84a300d9010281825820426e4ac6984d31aad7eed7f69106dda830474799ba2c898d5b837ae35db1b12701018282583900ad2b3ac4e3017adfb3cbb04c5ca7a678204daaac96accab6690010dc7ab98b3e995e211b8615b2466d3a93ec069e9d60f17cd1ef3434ea541a08f0d18082583900e33b8297e1ce697e07b12de2bc781280bac7b9c949c6194894e9b82132761cf8ea1eeb6628a4fc4fcf4470d6b8a38632a298d84f0c5b63c01b000000017451b7cf021a0002922da0f5f6
