// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import {ASTAR_REFRESH_BALANCE_INTERVAL} from '@subwallet/extension-base/constants';
import {_CardanoApi} from '@subwallet/extension-base/services/chain-service/types';
import {BalanceItem, SusbcribeCardanoPalletBallance} from '@subwallet/extension-base/types';
import {APIItemState} from "@subwallet/extension-base/background/KoniTypes";
import {filterAssetsByChainAndType} from "@subwallet/extension-base/utils";
import {_AssetType} from "@subwallet/chain-list/types";

async function getCardanoBalance (addresses: string[], cardanoApi: _CardanoApi): Promise<bigint[]> {
  return await Promise.all(addresses.map(async (address) => {
    try {
      return await cardanoApi.
    } catch (e) {
      return BigInt(0);
    }
  }))
}

export function subscribeCardanoBalance (params: SusbcribeCardanoPalletBallance) {
  const { addresses, assetMap, callback, cardanoApi, chainInfo } = params;
  const chain = chainInfo.slug;
  const nativeTokenInfo = filterAssetsByChainAndType(assetMap, chain, [_AssetType.NATIVE, _AssetType.CIP26]);

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
