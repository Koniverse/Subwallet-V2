// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { _AssetType, _ChainInfo } from '@subwallet/chain-list/types';
import { APIItemState, ApiMap, BalanceItem } from '@subwallet/extension-base/background/KoniTypes';
import { subscribeCosmosBalance } from '@subwallet/extension-base/koni/api/balance/cosmosBalance';
import { subscribeERC20Interval, subscribeEVMBalance } from '@subwallet/extension-base/koni/api/balance/evmBalance';
import { subscribeAssetsAccountPallet, subscribeEqBalanceAccountPallet, subscribeEquilibriumTokenBalance, subscribePSP22Balance, subscribeTokensAccountsPallet, subscribeWithSystemAccountPallet } from '@subwallet/extension-base/koni/api/balance/substrateBalance';
import { state } from '@subwallet/extension-base/koni/background/handlers';
import { _BALANCE_CHAIN_GROUP, _PURE_EVM_CHAINS } from '@subwallet/extension-base/services/chain-service/constants';
import { _EvmApi, _SubstrateApi } from '@subwallet/extension-base/services/chain-service/types';
import { _checkSmartContractSupportByChain, _isChainEvmCompatible, _isPureCosmosChain, _isPureEvmChain, _isPureSolanaChain } from '@subwallet/extension-base/services/chain-service/utils';
import { categoryAddresses } from '@subwallet/extension-base/utils';
import { subscribeSolanaBalance } from '@subwallet/extension-base/koni/api/balance/solanaBalance';

export function subscribeBalance (addresses: string[], chainInfoMap: Record<string, _ChainInfo>, apiMap: ApiMap, callback: (rs: BalanceItem) => void) {
  const [substrateAddresses, evmAddresses] = categoryAddresses(addresses);

  const evmApiMap = apiMap.evm;
  const substrateApiMap = apiMap.substrate;
  const cosmosApiMap = apiMap.cosmos;
  const solanaApiMap = apiMap.solana;

  // Looping over each chain
  const unsubList = Object.entries(chainInfoMap).map(async ([chainSlug, chainInfo]) => {
    const useAddresses = _isChainEvmCompatible(chainInfo) ? evmAddresses : substrateAddresses;

    if (_isPureEvmChain(chainInfo)) {
      const nativeTokenInfo = state.getNativeTokenInfo(chainSlug);

      return subscribeEVMBalance(chainSlug, useAddresses, evmApiMap, callback, nativeTokenInfo);
    }

    if (_isPureCosmosChain(chainInfo)) {
      return subscribeCosmosBalance(chainSlug, ['aura1v9vx354jj05rqfpx07xdrf3a38z97xml6cmh8f', 'aura1v3ccn6kdn2srkdh0vwta69fkzhf663nf9c4662'], cosmosApiMap, callback);
    }

    if (_isPureSolanaChain(chainInfo)) {
      return subscribeSolanaBalance(chainSlug, ['7T5pSBUnkrB2XtFRYzChamC4wonRbyyPSgabvp19RAgr'], solanaApiMap, callback);
    }

    if (!useAddresses || useAddresses.length === 0 || _PURE_EVM_CHAINS.indexOf(chainSlug) > -1) {
      const fungibleTokensByChain = state.chainService.getFungibleTokensByChain(chainSlug, true);
      const now = new Date().getTime();

      Object.values(fungibleTokensByChain).map((token) => {
        return {
          tokenSlug: token.slug,
          free: '0',
          locked: '0',
          state: APIItemState.READY,
          timestamp: now
        } as BalanceItem;
      }).forEach(callback);

      return undefined;
    }

    const networkAPI = await substrateApiMap[chainSlug].isReady;

    return subscribeSubstrateBalance(useAddresses, chainInfo, chainSlug, networkAPI, evmApiMap, callback);
  });

  return () => {
    unsubList.forEach((subProm) => {
      subProm.then((unsub) => {
        unsub && unsub();
      }).catch(console.error);
    });
  };
}

export async function subscribeSubstrateBalance (addresses: string[], chainInfo: _ChainInfo, chain: string, networkAPI: _SubstrateApi, evmApiMap: Record<string, _EvmApi>, callBack: (rs: BalanceItem) => void) {
  let unsubNativeToken: () => void;

  if (!_BALANCE_CHAIN_GROUP.kintsugi.includes(chain) && !_BALANCE_CHAIN_GROUP.genshiro.includes(chain) && !_BALANCE_CHAIN_GROUP.equilibrium_parachain.includes(chain)) {
    unsubNativeToken = await subscribeWithSystemAccountPallet(addresses, chainInfo, networkAPI.api, callBack);
  }

  let unsubLocalToken: () => void;
  let unsubEvmContractToken: () => void;
  let unsubWasmContractToken: () => void;

  try {
    if (_BALANCE_CHAIN_GROUP.bifrost.includes(chain)) {
      unsubLocalToken = await subscribeTokensAccountsPallet(addresses, chain, networkAPI.api, callBack);
    } else if (_BALANCE_CHAIN_GROUP.kintsugi.includes(chain)) {
      unsubLocalToken = await subscribeTokensAccountsPallet(addresses, chain, networkAPI.api, callBack, true);
    } else if (_BALANCE_CHAIN_GROUP.statemine.includes(chain)) {
      unsubLocalToken = await subscribeAssetsAccountPallet(addresses, chain, networkAPI.api, callBack);
    } else if (_BALANCE_CHAIN_GROUP.genshiro.includes(chain)) {
      unsubLocalToken = await subscribeEqBalanceAccountPallet(addresses, chain, networkAPI.api, callBack, true);
    } else if (_BALANCE_CHAIN_GROUP.equilibrium_parachain.includes(chain)) {
      unsubLocalToken = await subscribeEquilibriumTokenBalance(addresses, chain, networkAPI.api, callBack, true);
    }

    if (_isChainEvmCompatible(chainInfo)) {
      unsubEvmContractToken = subscribeERC20Interval(addresses, chain, evmApiMap, callBack);
    }

    if (_checkSmartContractSupportByChain(chainInfo, _AssetType.PSP22)) { // Get sub-token for substrate-based chains
      unsubWasmContractToken = subscribePSP22Balance(addresses, chain, networkAPI.api, callBack);
    }
  } catch (err) {
    console.warn(err);
  }

  return () => {
    unsubNativeToken && unsubNativeToken();
    unsubLocalToken && unsubLocalToken();
    unsubEvmContractToken && unsubEvmContractToken();
    unsubWasmContractToken && unsubWasmContractToken();
  };
}
