// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ALL_ACCOUNT_KEY } from '@subwallet/extension-base/constants';
import { AccountNetworkType } from '@subwallet/extension-base/types';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import { findAccountByAddress, getChainsByAccountType, isAccountAll } from '@subwallet/extension-koni-ui/utils';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

export const useGetChainSlugsByAccountType = (address?: string): string[] => {
  const chainInfoMap = useSelector((state: RootState) => state.chainStore.chainInfoMap);
  const { accountProxies, accounts, currentAccountProxy } = useSelector((state: RootState) => state.accountState);

  const networkTypes = useMemo((): AccountNetworkType[] => {
    const _address = address || currentAccountProxy?.id;

    if (_address) {
      if (isAccountAll(_address)) {
        const allAccount = accountProxies.find((proxy) => proxy.id === ALL_ACCOUNT_KEY);

        return allAccount?.networkTypes || [];
      }

      const proxy = accountProxies.find((proxy) => proxy.id === _address);

      if (proxy) {
        return proxy.networkTypes;
      }

      const account = findAccountByAddress(accounts, _address);

      if (account) {
        return [account.networkType];
      }
    }

    return [];
  }, [accountProxies, accounts, address, currentAccountProxy]);

  const specialNetwork = useMemo((): string | undefined => {
    const _address = address || currentAccountProxy?.id;

    if (_address) {
      if (isAccountAll(_address)) {
        const allAccount = accountProxies.find((proxy) => proxy.id === ALL_ACCOUNT_KEY);

        return allAccount?.specialNetwork;
      }

      const proxy = accountProxies.find((proxy) => proxy.id === _address);

      if (proxy) {
        return proxy.specialNetwork;
      }

      const account = findAccountByAddress(accounts, _address);

      if (account) {
        return account.specialNetwork;
      }
    }

    return undefined;
  }, [accountProxies, accounts, address, currentAccountProxy?.id]);

  return useMemo<string[]>(() => {
    return getChainsByAccountType(chainInfoMap, networkTypes, specialNetwork);
  }, [networkTypes, chainInfoMap, specialNetwork]);
};
