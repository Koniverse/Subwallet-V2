// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountProxy, AccountProxyType } from '@subwallet/extension-base/types';
import { AccountChainAddressItem, GeneralEmptyList } from '@subwallet/extension-koni-ui/components';
import { WalletModalContext } from '@subwallet/extension-koni-ui/contexts/WalletModalContextProvider';
import { useGetAccountChainAddresses, useNotification, useTranslation } from '@subwallet/extension-koni-ui/hooks';
import { AccountChainAddress, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { copyToClipboard } from '@subwallet/extension-koni-ui/utils';
import { Button, Icon, SwList } from '@subwallet/react-ui';
import { Strategy } from 'phosphor-react';
import React, { useCallback, useContext } from 'react';
import styled from 'styled-components';

type Props = ThemeProps & {
  accountProxy: AccountProxy;
};

function Component ({ accountProxy, className }: Props) {
  const { t } = useTranslation();
  const items: AccountChainAddress[] = useGetAccountChainAddresses(accountProxy);
  const notify = useNotification();
  const { addressQrModal } = useContext(WalletModalContext);

  const onShowQr = useCallback((item: AccountChainAddress) => {
    return () => {
      addressQrModal.open({
        address: item.address,
        chainSlug: item.slug
      });
    };
  }, [addressQrModal]);

  const onCopyAddress = useCallback((item: AccountChainAddress) => {
    return () => {
      copyToClipboard(item.address || '');
      notify({
        message: t('Copied to clipboard')
      });
    };
  }, [notify, t]);

  const renderItem = useCallback(
    (item: AccountChainAddress) => {
      return (
        <AccountChainAddressItem
          className={'address-item'}
          item={item}
          key={item.slug}
          onClickCopyButton={onCopyAddress(item)}
          onClickQrButton={onShowQr(item)}
        />
      );
    },
    [onCopyAddress, onShowQr]
  );

  const emptyList = useCallback(() => {
    return <GeneralEmptyList />;
  }, []);

  const searchFunction = useCallback(
    (item: AccountChainAddress, searchText: string) => {
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
        searchPlaceholder={t<string>('Enter network name')}
      />

      {
        accountProxy.accountType === AccountProxyType.SOLO && (
          <div className={'update-unified-account-button-wrapper'}>
            <Button
              block={true}
              className={'update-unified-account-button'}
              icon={(
                <Icon
                  phosphorIcon={Strategy}
                  weight='fill'
                />
              )}
            >
              {t('Upgrade to Unified account')}
            </Button>
          </div>
        )
      }
    </div>
  );
}

export const AccountAddressList = styled(Component)<Props>(({ theme: { token } }: Props) => ({
  display: 'flex',
  overflow: 'hidden',
  flexDirection: 'column',

  '.ant-sw-list-section': {
    flex: 1
  },

  '.ant-sw-list': {
    paddingBottom: 0
  },

  '.address-item + .address-item': {
    marginTop: token.marginXS
  },

  '.update-unified-account-button-wrapper': {
    paddingLeft: token.padding,
    paddingRight: token.padding,
    paddingTop: token.paddingSM,
    paddingBottom: token.paddingXXS
  }

}));
