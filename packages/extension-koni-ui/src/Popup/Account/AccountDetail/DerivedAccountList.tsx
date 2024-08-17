// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {AccountProxy} from '@subwallet/extension-base/types';
import { AccountProxySelectorItem, GeneralEmptyList } from '@subwallet/extension-koni-ui/components';
import { useTranslation } from '@subwallet/extension-koni-ui/hooks';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import { SwList } from '@subwallet/react-ui';
import React, { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';

type Props = ThemeProps & {
  accountProxy: AccountProxy;
};

function Component ({ accountProxy, className }: Props) {
  const accountProxies = useSelector((state: RootState) => state.accountState.accountProxies);

  const { t } = useTranslation();

  // todo: may have to sort the result
  const items = useMemo<AccountProxy[]>(() => {
    const result: AccountProxy[] = [];

    if (!accountProxy?.children?.length) {
      return [];
    }

    accountProxy.children.forEach((apId) => {
      const item = accountProxies.find((ap) => ap.id === apId);

      if (item) {
        result.push(item);
      }
    });

    return result;
  }, [accountProxies, accountProxy.children]);

  const renderItem = useCallback(
    (item: AccountProxy) => {
      return (
        <AccountProxySelectorItem
          accountProxy={item}
          className={'account-item'}
        />
      );
    },
    []
  );

  const emptyList = useCallback(() => {
    return <GeneralEmptyList />;
  }, []);

  const searchFunction = useCallback(
    (item: AccountProxy, searchText: string) => {
      if(item.accounts.length === 1){
         return item.name.toLowerCase().includes(searchText.toLowerCase()) || item.accounts[0].address.toLowerCase().includes(searchText.toLowerCase());
      }

      return item.name.toLowerCase().includes(searchText.toLowerCase());
    },
    []
  );

  return (
    <div className={className}>
      <SwList.Section
        enableSearchInput
        list={items}
        renderItem={renderItem}
        renderWhenEmpty={emptyList}
        searchFunction={searchFunction}
        searchMinCharactersCount={2}
        searchPlaceholder={t<string>('Enter account name or address')}
      />
    </div>
  );
}

export const DerivedAccountList = styled(Component)<Props>(({ theme: { token } }: Props) => ({
  display: 'flex',
  overflow: 'hidden',
  flexDirection: 'column',

  '.ant-sw-list-section': {
    flex: 1
  },

  '.ant-sw-list': {
    paddingBottom: 0
  },

  '.account-item + .account-item': {
    marginTop: token.marginXS
  }
}));
