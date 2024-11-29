// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { Transaction } from '@emurgo/cardano-serialization-lib-nodejs';
import { _AssetType, _ChainAsset } from '@subwallet/chain-list/types';
import { _isNativeToken } from '@subwallet/extension-base/services/chain-service/utils';

export function getCardanoAssetId (chainAsset: _ChainAsset): string {
  return chainAsset.metadata?.policyId as string;
}

export function _isCIP26Token (tokenInfo: _ChainAsset) {
  return [_AssetType.CIP26].includes(tokenInfo.assetType);
}

export function _isTokenTransferredByCardano (tokenInfo: _ChainAsset) {
  return _isCIP26Token(tokenInfo) || _isNativeToken(tokenInfo);
}

export function estimateCardanoTxFee (tx: string) {
  return Transaction.from_hex(tx).body().fee().to_str();
}

export const cborToBytes = (hex: string): Uint8Array => {
  if (hex.length % 2 === 0 && /^[0-9A-F]*$/i.test(hex)) {
    return Buffer.from(hex, 'hex');
  }

  return Buffer.from(hex, 'utf-8');
};
