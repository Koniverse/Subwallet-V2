// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountProxy } from '@subwallet/extension-base/types';
import { useSelector } from '@subwallet/extension-koni-ui/hooks';
import { AccountNetworkAddress } from '@subwallet/extension-koni-ui/types';
import { getChainsByAccountType, getReformatedAddressRelatedToNetwork } from '@subwallet/extension-koni-ui/utils';
import { useMemo } from 'react';

// todo:
//  - order the result
const useGetAccountNetworkAddresses = (accountProxy: AccountProxy): AccountNetworkAddress[] => {
  const chainInfoMap = useSelector((state) => state.chainStore.chainInfoMap);

  return useMemo(() => {
    const result: AccountNetworkAddress[] = [];
    const chains: string[] = getChainsByAccountType(chainInfoMap, accountProxy.networkTypes, accountProxy.specialNetwork);

    accountProxy.accounts.forEach((a) => {
      for (const chain of chains) {
        const chainInfo = chainInfoMap[chain];
        const reformatedAddress = getReformatedAddressRelatedToNetwork(a, chainInfo);

        if (reformatedAddress) {
          result.push({
            name: chainInfo.name,
            slug: chainInfo.slug,
            address: reformatedAddress
          });
        }
      }
    });

    return result;
  }, [accountProxy, chainInfoMap]);
};

export default useGetAccountNetworkAddresses;
