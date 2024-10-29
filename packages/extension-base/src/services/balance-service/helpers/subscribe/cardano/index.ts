// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import {ASTAR_REFRESH_BALANCE_INTERVAL} from '@subwallet/extension-base/constants';
import {BalanceItem, SusbcribeCardanoPalletBalance} from '@subwallet/extension-base/types';
import {APIItemState} from "@subwallet/extension-base/background/KoniTypes";
import {filterAssetsByChainAndType} from "@subwallet/extension-base/utils";
import {_AssetType} from "@subwallet/chain-list/types";

async function getCardanoBalance ({ addresses, assetMap, callback, chainInfo, cardanoApi }: SusbcribeCardanoPalletBalance): Promise<bigint[]> {
  const chain = chainInfo.slug;
  const tokenList = filterAssetsByChainAndType(assetMap, chain, [_AssetType.NATIVE, _AssetType.CIP26]);

  const getBalance = () => {
    Object.values(tokenList).map(async (tokenInfo) => {
      try {
        const balances = await Promise.all(addresses.map(async (address): Promise<bigint> => {
          try {
            const balanceMap = await cardanoApi.getBalanceMap(address);
            return
          }
        }
      }));
      }
  }

  // return await Promise.all(addresses.map(async (address) => {
  //   try {
  //     return await cardanoApi.
  //   } catch (e) {
  //     return BigInt(0);
  //   }
  // }))
}

export function subscribeCardanoBalance (params: SusbcribeCardanoPalletBalance) {
  const { addresses, assetMap, callback, cardanoApi, chainInfo } = params;
  const chain = chainInfo.slug;
  const nativeTokenInfo = filterAssetsByChainAndType(assetMap, chain, [_AssetType.NATIVE, _AssetType.CIP26]);
  const nativeTokenSlug = Object.values(nativeTokenInfo)[0]?.slug || '';

  function getBalance () {
    getCardanoBalance(addresses, cardanoApi)
      .then((balances) => {
        return balances.map((balance, index): BalanceItem => {
          return {
            address: addresses[index],
            tokenSlug: nativeTokenSlug,
            state: APIItemState.READY,
            free: balance.toString(),
            locked: '0' // todo: check staking on cardano
          }
        })
      })
  }

  getBalance();
  const interval = setInterval(getBalance, ASTAR_REFRESH_BALANCE_INTERVAL);

  return () => {
    clearInterval(interval);
  };
}
