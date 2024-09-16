// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { TON_CHAINS } from '@subwallet/extension-base/services/earning-service/constants';
import { AccountProxy } from '@subwallet/extension-base/types';
import { AccountChainAddressItem, CloseIcon, GeneralEmptyList } from '@subwallet/extension-koni-ui/components';
import { ACCOUNT_CHAIN_ADDRESSES_MODAL } from '@subwallet/extension-koni-ui/constants/modal';
import { WalletModalContext } from '@subwallet/extension-koni-ui/contexts/WalletModalContextProvider';
import { useGetAccountChainAddresses, useHandleLedgerGenericAccountWarning, useHandleTonAccountWarning, useNotification } from '@subwallet/extension-koni-ui/hooks';
import useTranslation from '@subwallet/extension-koni-ui/hooks/common/useTranslation';
import { AccountChainAddress, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { copyToClipboard } from '@subwallet/extension-koni-ui/utils';
import { Icon, SwList, SwModal } from '@subwallet/react-ui';
import CN from 'classnames';
import { CaretLeft } from 'phosphor-react';
import React, { useCallback, useContext, useEffect } from 'react';
import styled from 'styled-components';

type Props = ThemeProps & {
  accountProxy: AccountProxy;
  onCancel: VoidFunction;
  onBack?: VoidFunction;
};

const modalId = ACCOUNT_CHAIN_ADDRESSES_MODAL;

const Component: React.FC<Props> = ({ accountProxy, className, onBack, onCancel }: Props) => {
  const { t } = useTranslation();
  const items: AccountChainAddress[] = useGetAccountChainAddresses(accountProxy);
  const notify = useNotification();
  const onHandleTonAccountWarning = useHandleTonAccountWarning();
  const onHandleLedgerGenericAccountWarning = useHandleLedgerGenericAccountWarning();
  const { addressQrModal } = useContext(WalletModalContext);

  const onShowQr = useCallback((item: AccountChainAddress) => {
    return () => {
      const processFunction = () => {
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

      onHandleTonAccountWarning(item.accountType, () => {
        onHandleLedgerGenericAccountWarning({
          accountProxy: accountProxy,
          chainSlug: item.slug
        }, processFunction);
      });
    };
  }, [accountProxy, addressQrModal, onCancel, onHandleLedgerGenericAccountWarning, onHandleTonAccountWarning]);

  const onCopyAddress = useCallback((item: AccountChainAddress) => {
    return () => {
      const processFunction = () => {
        copyToClipboard(item.address || '');
        notify({
          message: t('Copied to clipboard')
        });
      };

      onHandleTonAccountWarning(item.accountType, () => {
        onHandleLedgerGenericAccountWarning({
          accountProxy: accountProxy,
          chainSlug: item.slug
        }, processFunction);
      });
    };
  }, [accountProxy, notify, onHandleLedgerGenericAccountWarning, onHandleTonAccountWarning, t]);

  const renderItem = useCallback(
    (item: AccountChainAddress) => {
      return (
        <AccountChainAddressItem
          className={'address-item'}
          item={item}
          key={item.slug}
          onClick={onShowQr(item)}
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

  useEffect(() => {
    if (addressQrModal.checkActive()) {
      addressQrModal.update((prev) => {
        if (!prev || !TON_CHAINS.includes(prev.chainSlug)) {
          return prev;
        }

        const targetAddress = items.find((i) => i.slug === prev.chainSlug)?.address;

        if (!targetAddress) {
          return prev;
        }

        return {
          ...prev,
          address: targetAddress
        };
      });
    }
  }, [addressQrModal, items]);

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

const AccountChainAddressesModal = styled(Component)<Props>(({ theme: { token } }: Props) => {
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

export default AccountChainAddressesModal;
