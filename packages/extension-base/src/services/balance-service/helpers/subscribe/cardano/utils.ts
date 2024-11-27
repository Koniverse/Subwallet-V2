// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { _AssetType, _ChainAsset } from '@subwallet/chain-list/types';
import { _isNativeToken } from '@subwallet/extension-base/services/chain-service/utils';
import { Transaction } from '@emurgo/cardano-serialization-lib-nodejs';

export function getCardanoAssetId (chainAsset: _ChainAsset): string {
  return chainAsset.metadata?.policyId as string;
}

export function _isCIP26Token (tokenInfo: _ChainAsset) {
  return [_AssetType.CIP26].includes(tokenInfo.assetType);
}

export function _isTokenTransferredByCardano (tokenInfo: _ChainAsset) {
  return _isCIP26Token(tokenInfo) || _isNativeToken(tokenInfo);
}

export async function estimateCardanoTxFee (tx: string) {
  return Transaction.from_hex(tx).body().fee().to_str();
}
