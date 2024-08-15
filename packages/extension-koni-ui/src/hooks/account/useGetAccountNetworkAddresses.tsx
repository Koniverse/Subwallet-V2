// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountProxy } from '@subwallet/extension-base/types';
import { useSelector } from '@subwallet/extension-koni-ui/hooks';
import { AccountNetworkAddress } from '@subwallet/extension-koni-ui/types';
import { getReformatedAddressRelatedToNetwork } from '@subwallet/extension-koni-ui/utils';
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
  }, [accountProxy.accounts, chainInfoMap]);
};

export default useGetAccountNetworkAddresses;
