// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountNetworkType, AccountProxy } from '@subwallet/extension-base/types';
import { reformatAddress } from '@subwallet/extension-base/utils';
import { useSelector } from '@subwallet/extension-koni-ui/hooks';
import { AccountNetworkAddress } from '@subwallet/extension-koni-ui/types';
import { isChainInfoAccordantNetworkType } from '@subwallet/extension-koni-ui/utils';
import { useMemo } from 'react';

// todo:
//  - order the result
//  - support bitcoin
//  - logic for generic, legacy ledger account
const useGetAccountNetworkAddresses = (accountProxy: AccountProxy): AccountNetworkAddress[] => {
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
        } else if (a.networkType === AccountNetworkType.TON && chainInfo.tonInfo) {
          result.push({
            name: chainInfo.name,
            slug: chainInfo.slug,
            address: reformatAddress(a.address, chainInfo.isTestnet ? 0 : 1)
          });
        }
      }
    });

    return result;
  }, [accountProxy.accounts, chainInfoMap]);
};

export default useGetAccountNetworkAddresses;
