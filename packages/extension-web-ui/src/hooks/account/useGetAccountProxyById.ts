// Copyright 2019-2022 @subwallet/extension-web-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountProxy } from '@subwallet/extension-base/types';
import { RootState } from '@subwallet/extension-web-ui/stores';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

const useGetAccountProxyById = (id?: string): AccountProxy | null => {
  const accountProxies = useSelector((state: RootState) => state.accountState.accountProxies);

  return useMemo((): AccountProxy | null => {
    return accountProxies.find((ap) => ap.id === id) || null;
  }, [accountProxies, id]);
};

export default useGetAccountProxyById;
