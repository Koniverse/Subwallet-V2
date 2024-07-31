// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountProxy } from '@subwallet/extension-base/types';
import { AccountNetworkAddressItem, GeneralEmptyList } from '@subwallet/extension-koni-ui/components';
import { useGetAccountNetworkAddress, useTranslation } from '@subwallet/extension-koni-ui/hooks';
import { AccountNetworkAddress, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { copyToClipboard } from '@subwallet/extension-koni-ui/utils';
import { SwList } from '@subwallet/react-ui';
import React, { useCallback } from 'react';
import styled from 'styled-components';

import useNotification from '../../../hooks/common/useNotification';

type Props = ThemeProps & {
  accountProxy: AccountProxy;
};

function Component ({ accountProxy, className }: Props) {
  const { t } = useTranslation();
  const items: AccountNetworkAddress[] = useGetAccountNetworkAddress(accountProxy);
  const notify = useNotification();

  const onCopyAddress = useCallback((item: AccountNetworkAddress) => {
    return () => {
      copyToClipboard(item.address || '');
      notify({
        message: t('Copied to clipboard')
      });
    };
  }, [notify, t]);

  const renderItem = useCallback(
    (item: AccountNetworkAddress) => {
      return (
        <AccountNetworkAddressItem
          className={'address-item'}
          item={item}
          key={item.slug}
          onClickCopyButton={onCopyAddress(item)}
        />
      );
    },
    [onCopyAddress]
  );

  const emptyList = useCallback(() => {
    return <GeneralEmptyList />;
  }, []);

  const searchFunction = useCallback(
    (item: AccountNetworkAddress, searchText: string) => {
      return item.name.toLowerCase().includes(searchText.toLowerCase());
    },
    []
  );

  return (
    <div className={className}>
      <SwList.Section
        className={className}
        enableSearchInput
        list={items}
        renderItem={renderItem}
        renderWhenEmpty={emptyList}
        searchFunction={searchFunction}
        searchMinCharactersCount={2}
        searchPlaceholder={t<string>('Enter network name')}
      />
    </div>
  );
}

export const AccountAddressList = styled(Component)<Props>(({ theme: { token } }: Props) => ({
  '.ant-sw-list-section': {
    height: '100%'
  },

  '.ant-sw-list': {
    paddingBottom: 0
  },

  '.address-item + .address-item': {
    marginTop: token.marginXS
  }
}));
