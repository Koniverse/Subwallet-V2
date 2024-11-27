// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { _AssetType } from '@subwallet/chain-list/types';
import { APIItemState } from '@subwallet/extension-base/background/KoniTypes';
import { ASTAR_REFRESH_BALANCE_INTERVAL } from '@subwallet/extension-base/constants';
import { CardanoBalanceItem } from '@subwallet/extension-base/services/balance-service/helpers/subscribe/cardano/types';
import { getCardanoAssetId } from '@subwallet/extension-base/services/balance-service/helpers/subscribe/cardano/utils';
import { _CardanoApi } from '@subwallet/extension-base/services/chain-service/types';
import { BalanceItem, SusbcribeCardanoPalletBalance } from '@subwallet/extension-base/types';
import { filterAssetsByChainAndType, reformatAddress } from '@subwallet/extension-base/utils';

async function getBalanceMap (addresses: string[], cardanoApi: _CardanoApi, isTestnet: boolean): Promise<Record<string, CardanoBalanceItem[]>> {
  const addressBalanceMap: Record<string, CardanoBalanceItem[]> = {};

  for (const address of addresses) {
    addressBalanceMap[address] = await cardanoApi.getBalanceMap(isTestnet ? reformatAddress(address, 0) : address);
  }

  return addressBalanceMap;
}

export function subscribeCardanoBalance (params: SusbcribeCardanoPalletBalance) {
  const { addresses, assetMap, callback, cardanoApi, chainInfo } = params;
  const chain = chainInfo.slug;
  const isTestnet = chainInfo.isTestnet;
  const tokens = filterAssetsByChainAndType(assetMap, chain, [_AssetType.NATIVE, _AssetType.CIP26]);

  function getBalance () {
    getBalanceMap(addresses, cardanoApi, isTestnet)
      .then((addressBalanceMap) => {
        Object.values(tokens).forEach((tokenInfo) => {
          const id = getCardanoAssetId(tokenInfo);
          const balances = addresses.map((address) => {
            if (!addressBalanceMap[address]) {
              return '0';
            }

            return addressBalanceMap[address].find((asset) => asset.unit === id)?.quantity || '0';
          });

          const items: BalanceItem[] = balances.map((balance, index): BalanceItem => {
            return {
              address: addresses[index],
              tokenSlug: tokenInfo.slug,
              free: balance,
              locked: '0', // todo: research cardano lock balance
              state: APIItemState.READY
            };
          });

          callback(items);
        });
      })
      .catch((e) => console.error('Error while fetching cardano balance', e));
  }

  const interval = setInterval(getBalance, ASTAR_REFRESH_BALANCE_INTERVAL);

  getBalance();

  return () => {
    clearInterval(interval);
  };
}
