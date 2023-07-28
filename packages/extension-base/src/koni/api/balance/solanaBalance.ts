// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { PublicKey } from '@solana/web3.js';
import { _AssetType, _ChainAsset } from '@subwallet/chain-list/types';
import { APIItemState, BalanceItem } from '@subwallet/extension-base/background/KoniTypes';
import { ASTAR_REFRESH_BALANCE_INTERVAL } from '@subwallet/extension-base/constants';
import { state } from '@subwallet/extension-base/koni/background/handlers';
import { SolanaApi } from '@subwallet/extension-base/services/chain-service/handler/SolanaApi';
import { sumBN } from '@subwallet/extension-base/utils';

import { BN } from '@polkadot/util';

async function getSolanaBalance (tokenInfo: _ChainAsset, addresses: string[], solanaApi: SolanaApi) {
  console.log('addresses', addresses);
  return await Promise.all(addresses.map(async (address) => {
    console.log('address', address);
    const publicKey = new PublicKey(address);
    console.log('publicKey', publicKey.toString());

    const version = solanaApi.api;

    console.log('version', version);

    return await solanaApi.api.getBalance(publicKey);
  }));
}

export function subscribeSolanaBalance (chain: string, addresses: string[], solanaApiMap: Record<string, SolanaApi>, callBack: (rs: BalanceItem) => void) {
  const cosmosApi = solanaApiMap[chain];
  const tokenMap = state.getAssetByChainAndAsset(chain, [_AssetType.NATIVE, _AssetType.LOCAL]);

  function getBalance () {
    Object.values(tokenMap).map((tokenInfo) => {
      return getSolanaBalance(tokenInfo, addresses, cosmosApi)
        .then((balances) => {
          callBack({
            tokenSlug: tokenInfo.slug,
            locked: '0',
            free: sumBN(balances.map((balance) => (new BN(balance.toString() || '0')))).toString(),
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
