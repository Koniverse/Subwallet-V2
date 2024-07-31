// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainInfo } from '@subwallet/chain-list/types';
import { _isChainEvmCompatible, _isPureSubstrateChain } from '@subwallet/extension-base/services/chain-service/utils';
import { AccountNetworkType, AccountProxy } from '@subwallet/extension-base/types';
import { reformatAddress } from '@subwallet/extension-base/utils';
import { useSelector } from '@subwallet/extension-koni-ui/hooks';
import { AccountNetworkAddress } from '@subwallet/extension-koni-ui/types';
import { useMemo } from 'react';

function isChainInfoAccordantNetworkType (chainInfo: _ChainInfo, networkType: AccountNetworkType): boolean {
  if (networkType === AccountNetworkType.SUBSTRATE) {
    return _isPureSubstrateChain(chainInfo);
  }

  if (networkType === AccountNetworkType.ETHEREUM) {
    return _isChainEvmCompatible(chainInfo);
  }

  return false;
}

// todo:
//  - order the result
//  - support ton, bitcoin
//  - logic for generic, legacy ledger account
const useGetAccountNetworkAddress = (accountProxy: AccountProxy): AccountNetworkAddress[] => {
  const chainInfoMap = useSelector((state) => state.chainStore.chainInfoMap);

  return useMemo(() => {
    const result: AccountNetworkAddress[] = [];

    accountProxy.accounts.forEach((a) => {
      for (const chainSlug in chainInfoMap) {
        const chainInfo = chainInfoMap[chainSlug];

        if (!isChainInfoAccordantNetworkType(chainInfo, a.networkType)) {
          continue;
        }

        if (a.networkType === AccountNetworkType.SUBSTRATE && chainInfo.substrateInfo) {
          result.push({
            name: chainInfo.name,
            slug: chainInfo.slug,
            address: reformatAddress(a.address, chainInfo.substrateInfo.addressPrefix)
          });
        } else if (a.networkType === AccountNetworkType.ETHEREUM && chainInfo.evmInfo) {
          result.push({
            name: chainInfo.name,
            slug: chainInfo.slug,
            address: a.address
          });
        }
      }
    });

    return result;
  }, [accountProxy.accounts, chainInfoMap]);
};

export default useGetAccountNetworkAddress;
