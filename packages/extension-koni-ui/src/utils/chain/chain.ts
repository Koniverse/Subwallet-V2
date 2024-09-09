// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainInfo, _ChainStatus } from '@subwallet/chain-list/types';
import { _getSubstrateGenesisHash, _isChainBitcoinCompatible, _isChainEvmCompatible, _isChainTonCompatible, _isPureSubstrateChain } from '@subwallet/extension-base/services/chain-service/utils';
import { AccountChainType, AccountProxy, AccountProxyType } from '@subwallet/extension-base/types';

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

export const isChainInfoAccordantAccountChainType = (chainInfo: _ChainInfo, chainType: AccountChainType): boolean => {
  if (chainType === AccountChainType.SUBSTRATE) {
    return _isPureSubstrateChain(chainInfo);
  }

  if (chainType === AccountChainType.ETHEREUM) {
    return _isChainEvmCompatible(chainInfo);
  }

  if (chainType === AccountChainType.TON) {
    return _isChainTonCompatible(chainInfo);
  }

  if (chainType === AccountChainType.BITCOIN) {
    return _isChainBitcoinCompatible(chainInfo);
  }

  return false;
};

export const isChainCompatibleWithAccountChainTypes = (chainInfo: _ChainInfo, chainTypes: AccountChainType[]): boolean => {
  return chainTypes.some((chainType) => isChainInfoAccordantAccountChainType(chainInfo, chainType));
};

export const getChainsByAccountType = (_chainInfoMap: Record<string, _ChainInfo>, chainTypes: AccountChainType[], specialChain?: string): string[] => {
  const chainInfoMap = Object.fromEntries(Object.entries(_chainInfoMap).filter(([, chainInfo]) => chainInfo.chainStatus === _ChainStatus.ACTIVE));

  if (specialChain) {
    return Object.keys(chainInfoMap).filter((chain) => specialChain === chain);
  } else {
    const result: string[] = [];

    for (const chainInfo of Object.values(chainInfoMap)) {
      if (isChainCompatibleWithAccountChainTypes(chainInfo, chainTypes)) {
        result.push(chainInfo.slug);
      }
    }

    return result;
  }
};

// Note : Use this function when need filter all has only special chains
interface ChainSpecialFilteredRecord {
  slugs: string[];
  chainInfo: Record<string, _ChainInfo>
}

export const getChainsByAllAccountType = (accountProxies: AccountProxy[], chainTypes: AccountChainType[], _chainInfoMap: Record<string, _ChainInfo>, specialChain?: string): ChainSpecialFilteredRecord => {
  const specialChainRecord: Record<AccountChainType, string[]> = {} as Record<AccountChainType, string[]>;
  const chainInfoMap = Object.fromEntries(Object.entries(_chainInfoMap).filter(([, chainInfo]) => chainInfo.chainStatus === _ChainStatus.ACTIVE));

  for (const proxy of accountProxies) {
    if (proxy.specialChain) {
      specialChainRecord[proxy.chainTypes[0]] = [...specialChainRecord[proxy.chainTypes[0]] || [], proxy.specialChain];
    } else {
      proxy.chainTypes.forEach((chainType) => {
        specialChainRecord[chainType] = ['*'];
      });

      if (proxy.accountType === AccountProxyType.UNIFIED) {
        break;
      }
    }
  }

  const result: ChainSpecialFilteredRecord = {
    slugs: [],
    chainInfo: {}
  };

  if (!specialChain) {
    Object.values(chainInfoMap).forEach((chainInfo) => {
      const isAllowed = chainTypes.some((chainType) => {
        const specialChains = specialChainRecord[chainType];

        return (specialChains.includes('*') || specialChains.includes(chainInfo.slug)) && isChainInfoAccordantAccountChainType(chainInfo, chainType);
      });

      if (isAllowed) {
        result.slugs.push(chainInfo.slug);
        result.chainInfo[chainInfo.slug] = chainInfo;
      }
    });
  } else {
    result.slugs = Object.keys(chainInfoMap).filter((chain) => {
      if (specialChain === chain) {
        const chainInfo = chainInfoMap[chain];

        result.chainInfo[chainInfo.slug] = chainInfo;

        return true;
      }

      return false;
    });
  }

  return result;
};
