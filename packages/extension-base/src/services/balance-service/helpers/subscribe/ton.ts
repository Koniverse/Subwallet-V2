// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { _AssetType } from '@subwallet/chain-list/types';
import { APIItemState } from '@subwallet/extension-base/background/KoniTypes';
import { ASTAR_REFRESH_BALANCE_INTERVAL } from '@subwallet/extension-base/constants';
import { _TonApi } from '@subwallet/extension-base/services/chain-service/types';
import { BalanceItem, SubscribeTonPalletBalance } from '@subwallet/extension-base/types';
import { filterAssetsByChainAndType } from '@subwallet/extension-base/utils';
import { Address } from '@ton/core';

// todo: export subscribeJettonBalance

async function getTonBalance (addresses: string[], tonApi: _TonApi): Promise<bigint[]> {
  return await Promise.all(addresses.map(async (address) => {
    try {
      const tonAddress = Address.parse(address);

      return await tonApi.api.getBalance(tonAddress);
    } catch (e) {
      return 0n;
    }
  }));
}

export function subscribeTonBalance (params: SubscribeTonPalletBalance) {
  const { addresses, assetMap, callback, chainInfo, tonApi } = params;
  const chain = chainInfo.slug;
  const nativeTokenInfo = filterAssetsByChainAndType(assetMap, chain, [_AssetType.NATIVE]);
  const nativeTokenSlug = Object.values(nativeTokenInfo)[0]?.slug || '';

  function getBalance () {
    getTonBalance(addresses, tonApi)
      .then((balances) => {
        return balances.map((balance, index): BalanceItem => {
          return {
            address: addresses[index],
            tokenSlug: nativeTokenSlug,
            state: APIItemState.READY,
            free: balance.toString(),
            locked: '0'
          };
        });
      })
      .catch((e) => {
        console.error(`Error on get native balance with token ${nativeTokenSlug}`, e);

        return addresses.map((address): BalanceItem => {
          return {
            address: address,
            tokenSlug: nativeTokenSlug,
            state: APIItemState.READY,
            free: '0',
            locked: '0'
          };
        });
      })
      .then((items) => callback(items))
      .catch(console.error);
  }

  getBalance();
  const interval = setInterval(getBalance, ASTAR_REFRESH_BALANCE_INTERVAL);

  return () => {
    clearInterval(interval);
  };
}
