// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { _AssetType } from '@subwallet/chain-list/types';
import { APIItemState } from '@subwallet/extension-base/background/KoniTypes';
import { ASTAR_REFRESH_BALANCE_INTERVAL, SUB_TOKEN_REFRESH_BALANCE_INTERVAL } from '@subwallet/extension-base/constants';
import { getJettonMasterContract, getJettonWalletContract } from '@subwallet/extension-base/services/balance-service/helpers/subscribe/ton/utils';
import { _TonApi } from '@subwallet/extension-base/services/chain-service/types';
import { _getContractAddressOfToken } from '@subwallet/extension-base/services/chain-service/utils';
import { BalanceItem, SubscribeTonPalletBalance } from '@subwallet/extension-base/types';
import { filterAssetsByChainAndType } from '@subwallet/extension-base/utils';
import { Address } from '@ton/core';
import { JettonMaster, OpenedContract } from '@ton/ton';

export function subscribeJettonBalanceInterval ({ addresses, assetMap, callback, chainInfo, tonApi }: SubscribeTonPalletBalance): () => void {
  const chain = chainInfo.slug;
  const tokenList = filterAssetsByChainAndType(assetMap, chain, [_AssetType.TEP74]);
  const jettonMasterContractMap = {} as Record<string, OpenedContract<JettonMaster>>;

  Object.entries(tokenList).forEach(([slug, tokenInfo]) => {
    jettonMasterContractMap[slug] = getJettonMasterContract(tonApi, _getContractAddressOfToken(tokenInfo));
  });

  const getJettonBalances = () => {
    Object.values(tokenList).map(async (tokenInfo) => {
      try {
        const masterContract = jettonMasterContractMap[tokenInfo.slug];
        const balances = await Promise.all(addresses.map(async (address): Promise<bigint> => {
          try {
            const jettonWalletContract = await getJettonWalletContract(masterContract, tonApi, address);

            return await jettonWalletContract.getBalance();
          } catch (e) {
            console.error(`Error on get balance of account ${address} for token ${tokenInfo.slug}`, e);

            return BigInt(0);
          }
        }));

        const items: BalanceItem[] = balances.map((balance, index): BalanceItem => {
          return {
            address: addresses[index],
            tokenSlug: tokenInfo.slug,
            free: balance.toString(),
            locked: '0',
            state: APIItemState.READY
          };
        });

        callback(items);
      } catch (err) {
        console.log(tokenInfo.slug, err);
      }
    });
  };

  getJettonBalances();

  const interval = setInterval(getJettonBalances, SUB_TOKEN_REFRESH_BALANCE_INTERVAL);

  return () => {
    clearInterval(interval);
  };
}

async function getTonBalance (addresses: string[], tonApi: _TonApi): Promise<bigint[]> {
  return await Promise.all(addresses.map(async (address) => {
    try {
      const tonAddress = Address.parse(address);

      return await tonApi.getBalance(tonAddress);
    } catch (e) {
      return BigInt(0);
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
  const unsub2 = subscribeJettonBalanceInterval(params);

  return () => {
    clearInterval(interval);
    unsub2 && unsub2();
  };
}
