// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { BIG_TEN } from '@subwallet/extension-base/services/chain-service/health-check/constants';
import { AssetSpec } from '@subwallet/extension-base/services/chain-service/health-check/utils/asset-info';
import BigN from 'bignumber.js';
import {_ChainAsset, _ChainInfo} from "@subwallet/chain-list/types";

export interface NativeAssetInfo {
  decimals: number;
  existentialDeposit: string;
  symbol: string;
}

// const skipAsset = [
//   'acala_evm',
//   'karura_evm',
//   'commune'
// ]

// function for old health-check chain
export const compareNativeAsset = (
  assetInfo: AssetSpec,
  nativeAsset: NativeAssetInfo,
  errors: string[],
  chainInfo: _ChainInfo
) => {
    //if(!skipAsset.includes(chainInfo.slug)) {
      const {decimals: _decimals, existentialDeposit: _minAmount, symbol: _symbol} = nativeAsset;
      const {decimals, minAmount, symbol} = assetInfo;

      if (minAmount !== _minAmount) {
        if (chainInfo.isTestnet) {
          errors.push(`Wrong minAmount but it is Testnet`)
        }else {
          const convert = new BigN(minAmount).dividedBy(BIG_TEN.pow(decimals)).toFixed();
          const _convert = new BigN(_minAmount ?? '0').dividedBy(BIG_TEN.pow(_decimals)).toFixed();

          errors.push(`Wrong min amount: current - ${_minAmount} (${_convert}), onChain - ${minAmount} (${convert})`);
        }
      }

      if (symbol !== _symbol) {
        if (chainInfo.isTestnet) {
          errors.push(`Wrong symbol but it is Testnet`)
        }else
        {
          errors.push(`Wrong symbol: current - ${_symbol}, onChain - ${symbol}`);
        }
      }

      if (decimals !== _decimals) {
        if (chainInfo.isTestnet) {
          errors.push(`Wrong decimals but it is Testnet`)
        }else
        {
          errors.push(`Wrong decimals: current - ${_decimals}, onChain - ${decimals}`);
        }
      }
    //}

};

export const checkNativeAsset = (
  assetInfo: AssetSpec,
  nativeAsset: NativeAssetInfo
): boolean => {
  const { decimals: _decimals, existentialDeposit: _minAmount, symbol: _symbol } = nativeAsset;
  const { decimals, minAmount, symbol } = assetInfo;

  return (
    minAmount === _minAmount &&
    symbol === _symbol &&
    decimals === _decimals
  );
};

export const checkSs58Prefix = (onchainPrefix: number, chainlistPrefix: number) => {
  return onchainPrefix === chainlistPrefix;
};

export const checkParachainId = (onchainPrefix: number | null, chainlistPrefix: number | null) => {
  return onchainPrefix === chainlistPrefix;
};
