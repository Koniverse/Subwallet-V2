// Copyright 2019-2022 @subwallet/extension-web-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountProxy } from '@subwallet/extension-base/types';
import { useSelector } from '@subwallet/extension-web-ui/hooks';
import { AccountChainAddress } from '@subwallet/extension-web-ui/types';
import { getChainsByAccountType, getReformatedAddressRelatedToChain } from '@subwallet/extension-web-ui/utils';
import { useMemo } from 'react';

// todo:
//  - order the result
const useGetAccountChainAddresses = (accountProxy: AccountProxy): AccountChainAddress[] => {
  const chainInfoMap = useSelector((state) => state.chainStore.chainInfoMap);

  return useMemo(() => {
    const result: AccountChainAddress[] = [];
    const chains: string[] = getChainsByAccountType(chainInfoMap, accountProxy.chainTypes, accountProxy.specialChain);

    accountProxy.accounts.forEach((a) => {
      for (const chain of chains) {
        const chainInfo = chainInfoMap[chain];
        const reformatedAddress = getReformatedAddressRelatedToChain(a, chainInfo);

        if (reformatedAddress) {
          result.push({
            name: chainInfo.name,
            slug: chainInfo.slug,
            address: reformatedAddress,
            accountType: a.type
          });
        }
      }
    });

    return result;
  }, [accountProxy, chainInfoMap]);
};

export default useGetAccountChainAddresses;
