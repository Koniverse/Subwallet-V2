// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { _AssetType, _ChainAsset } from '@subwallet/chain-list/types';
import { APIItemState, BalanceItem } from '@subwallet/extension-base/background/KoniTypes';
import { ASTAR_REFRESH_BALANCE_INTERVAL } from '@subwallet/extension-base/constants';
import { state } from '@subwallet/extension-base/koni/background/handlers';
import { CosmosApi } from '@subwallet/extension-base/services/chain-service/handler/CosmosApi';
import { _getCosmosTokenDenom } from '@subwallet/extension-base/services/chain-service/utils';
import { sumBN } from '@subwallet/extension-base/utils';

import { BN } from '@polkadot/util';

async function getCosmosBalance (tokenInfo: _ChainAsset, addresses: string[], cosmosApi: CosmosApi) {
  return await Promise.all(addresses.map(async (address) => {
    return await cosmosApi.api.getBalance(address, _getCosmosTokenDenom(tokenInfo));
  }));
}

export function subscribeCosmosBalance (chain: string, addresses: string[], cosmosApiMap: Record<string, CosmosApi>, callBack: (rs: BalanceItem) => void) {
  const cosmosApi = cosmosApiMap[chain];
  const tokenMap = state.getAssetByChainAndAsset(chain, [_AssetType.NATIVE, _AssetType.LOCAL]);

  function getBalance () {
    Object.values(tokenMap).map((tokenInfo) => {
      return getCosmosBalance(tokenInfo, addresses, cosmosApi)
        .then((coins) => {
          callBack({
            tokenSlug: tokenInfo.slug,
            locked: '0',
            free: sumBN(coins.map((coin) => (new BN(coin.amount || '0')))).toString(),
            state: APIItemState.READY
          });
        })
        .catch(console.error);
    });
  }

  getBalance();
  const interval = setInterval(getBalance, ASTAR_REFRESH_BALANCE_INTERVAL);

  return () => {
    clearInterval(interval);
  };
}
