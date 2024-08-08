// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainInfo } from '@subwallet/chain-list/types';
import { _getSubstrateGenesisHash, _isChainEvmCompatible, _isChainTonCompatible, _isPureSubstrateChain } from '@subwallet/extension-base/services/chain-service/utils';
import { AccountNetworkType } from '@subwallet/extension-base/types';

export const findChainInfoByGenesisHash = (chainMap: Record<string, _ChainInfo>, genesisHash?: string): _ChainInfo | null => {
  if (!genesisHash) {
    return null;
  }

  for (const chainInfo of Object.values(chainMap)) {
    if (_getSubstrateGenesisHash(chainInfo)?.toLowerCase() === genesisHash.toLowerCase()) {
      return chainInfo;
    }
  }

  return null;
};

export const findChainInfoByChainId = (chainMap: Record<string, _ChainInfo>, chainId?: number): _ChainInfo | null => {
  if (!chainId) {
    return null;
  }

  for (const chainInfo of Object.values(chainMap)) {
    if (chainInfo.evmInfo?.evmChainId === chainId) {
      return chainInfo;
    }
  }

  return null;
};

export const isChainInfoAccordantNetworkType = (chainInfo: _ChainInfo, networkType: AccountNetworkType): boolean => {
  if (networkType === AccountNetworkType.SUBSTRATE) {
    return _isPureSubstrateChain(chainInfo);
  }

  if (networkType === AccountNetworkType.ETHEREUM) {
    return _isChainEvmCompatible(chainInfo);
  }

  if (networkType === AccountNetworkType.TON) {
    return _isChainTonCompatible(chainInfo);
  }

  return false;
};
