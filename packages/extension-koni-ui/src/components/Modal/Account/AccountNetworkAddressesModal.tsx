// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountProxy } from '@subwallet/extension-base/types';
import { AccountNetworkAddressItem, CloseIcon, GeneralEmptyList } from '@subwallet/extension-koni-ui/components';
import { ACCOUNT_NETWORK_ADDRESSES_MODAL } from '@subwallet/extension-koni-ui/constants/modal';
import { WalletModalContext } from '@subwallet/extension-koni-ui/contexts/WalletModalContextProvider';
import { useGetAccountNetworkAddresses, useNotification } from '@subwallet/extension-koni-ui/hooks';
import useTranslation from '@subwallet/extension-koni-ui/hooks/common/useTranslation';
import { AccountNetworkAddress, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { copyToClipboard } from '@subwallet/extension-koni-ui/utils';
import { Icon, SwList, SwModal } from '@subwallet/react-ui';
import CN from 'classnames';
import { CaretLeft } from 'phosphor-react';
import React, { useCallback, useContext } from 'react';
import styled from 'styled-components';

type Props = ThemeProps & {
  accountProxy: AccountProxy;
  onCancel: VoidFunction;
  onBack?: VoidFunction;
};

const modalId = ACCOUNT_NETWORK_ADDRESSES_MODAL;

const Component: React.FC<Props> = ({ accountProxy, className, onBack, onCancel }: Props) => {
  const { t } = useTranslation();
  const items: AccountNetworkAddress[] = useGetAccountNetworkAddresses(accountProxy);
  const notify = useNotification();
  const { addressQrModal } = useContext(WalletModalContext);

  const onShowQr = useCallback((item: AccountNetworkAddress) => {
    return () => {
      addressQrModal.open({
        address: item.address,
        chainSlug: item.slug,
        onBack: addressQrModal.close,
        onCancel: () => {
          addressQrModal.close();
          onCancel();
        }
      });
    };
  }, [addressQrModal, onCancel]);

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
    (item: AccountNetworkAddress, searchText: string) => {
      return item.name.toLowerCase().includes(searchText.toLowerCase());
    },
    []
  );

  return (
    <SwModal
      className={CN(className)}
      closeIcon={
        onBack
          ? (
            <Icon
              phosphorIcon={CaretLeft}
              size='md'
            />
          )
          : undefined
      }
      destroyOnClose={true}
      id={modalId}
      onCancel={onBack || onCancel}
      rightIconProps={onBack
        ? {
          icon: <CloseIcon />,
          onClick: onCancel
        }
        : undefined}
      title={t<string>('Select address')}
    >
      <SwList.Section
        enableSearchInput
        list={items}
        renderItem={renderItem}
        renderWhenEmpty={emptyList}
        searchFunction={searchFunction}
        searchMinCharactersCount={2}
        searchPlaceholder={t<string>('Enter network name')}
      />
    </SwModal>
  );
};

const AccountNetworkAddressesModal = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {
    '.ant-sw-modal-content': {
      height: '200vh',
      overflowY: 'hidden'
    },

    '.ant-sw-list-search-input': {
      paddingBottom: token.paddingXS
    },

    '.ant-sw-modal-body': {
      paddingLeft: 0,
      paddingRight: 0
    },

    '.ant-sw-list-section': {
      height: '100%'
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
  };
});

export default AccountNetworkAddressesModal;
