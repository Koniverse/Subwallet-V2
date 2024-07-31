// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountProxy } from '@subwallet/extension-base/types';
import { useSelector } from '@subwallet/extension-koni-ui/hooks';
import { useMemo } from 'react';

// todo: recheck logic to get account proxies
const useGetDerivedAccountProxies = (parentAccountProxy: AccountProxy): AccountProxy[] => {
  const accountProxies = useSelector((state) => state.accountState.accountProxies);

  return useMemo(() => {
    const result: AccountProxy[] = [];

    accountProxies.forEach((ap) => {
      if (ap.parentId && ap.parentId === parentAccountProxy.id) {
        result.push(ap);
      }
    });

    return result;
  }, [accountProxies, parentAccountProxy.id]);
};

export default useGetDerivedAccountProxies;
