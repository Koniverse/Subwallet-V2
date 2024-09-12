// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ResponseGetAllTonWalletContractVersion } from '@subwallet/extension-base/types';
import { GeneralEmptyList } from '@subwallet/extension-koni-ui/components';
import ChangeVersionWalletConractItem from '@subwallet/extension-koni-ui/components/ChangeVersionWalletConractItem';
import { CHANGE_VERSION_WALLET_CONTRACT } from '@subwallet/extension-koni-ui/constants/modal';
import { useGetAccountByAddress, useNotification } from '@subwallet/extension-koni-ui/hooks';
import useTranslation from '@subwallet/extension-koni-ui/hooks/common/useTranslation';
import { tonAccountChangeWalletContractVersion, tonGetAllWalletContractVersion } from '@subwallet/extension-koni-ui/messaging';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import { TonWalletContractVersion } from '@subwallet/keyring/types';
import { Button, Icon, SwList, SwModal } from '@subwallet/react-ui';
import CN from 'classnames';
import { CaretLeft, CheckCircle, FadersHorizontal } from 'phosphor-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

type Props = ThemeProps & {
  onCancel?: VoidFunction;
  id: string;
  chainSlug: string;
  address: string;
};

export type WalletContractItem = {
  walletType: TonWalletContractVersion,
  value: string,
  isSelected: boolean,
  chainSlug: string
}

const changeVersionWalletContractModalId = CHANGE_VERSION_WALLET_CONTRACT;

const Component: React.FC<Props> = ({ address, chainSlug, className, onCancel }: Props) => {
  const { t } = useTranslation();
  const notification = useNotification();
  const [tonWalletVersionData, setTonWalletVersionData] = useState<ResponseGetAllTonWalletContractVersion | null>(null);
  const accountInfo = useGetAccountByAddress(address);
  const [selectedContractVersion, setSelectedContractVersion] = useState<TonWalletContractVersion | undefined>(
    accountInfo ? accountInfo.tonContractVersion as TonWalletContractVersion : undefined
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let sync = true;

    if (accountInfo?.address) {
      tonGetAllWalletContractVersion({ address: accountInfo.address }).then((result) => {
        if (sync) {
          setTonWalletVersionData(result);
        }
      }).catch((e: Error) => {
        sync && notification({
          message: e.message,
          type: 'error'
        });
      });
    }

    return () => {
      sync = false;
    };
  }, [accountInfo?.address, notification]);

  const renderEmpty = useCallback(() => {
    return <GeneralEmptyList />;
  }, []);

  const resultList = useMemo((): WalletContractItem[] => {
    if (!tonWalletVersionData?.addressMap) {
      return [];
    }

    const addressMap = tonWalletVersionData.addressMap;

    return Object.entries(addressMap).map(([walletType, value]) => {
      const validWalletType = walletType as TonWalletContractVersion;

      return {
        walletType: validWalletType,
        value,
        isSelected: validWalletType === selectedContractVersion,
        chainSlug
      };
    });
  }, [tonWalletVersionData?.addressMap, selectedContractVersion, chainSlug]);

  const onClickItem = useCallback((walletType: TonWalletContractVersion) => {
    return () => {
      setSelectedContractVersion(walletType);
    };
  }, []);

  const renderItem = useCallback((item: WalletContractItem) => {
    return (
      <ChangeVersionWalletConractItem
        className={'item'}
        key={item.walletType}
        onClick={onClickItem(item.walletType)}
        {...item}
      />
    );
  }, [onClickItem]);

  const onConfirmButton = useCallback(() => {
    if (accountInfo?.address && selectedContractVersion) {
      setIsSubmitting(true);

      tonAccountChangeWalletContractVersion({ proxyId: '', address: accountInfo.address, version: selectedContractVersion })
        .then(() => {
          setTimeout(() => {
            onCancel?.();
            setIsSubmitting(false);
          }, 300);
        })
        .catch((e: Error) => {
          notification({
            message: e.message,
            type: 'error'
          });
        });
    }
  }, [accountInfo?.address, notification, onCancel, selectedContractVersion]);

  return (
    <SwModal
      className={CN(className, 'wallet-version-modal')}
      closeIcon={
        <Icon
          phosphorIcon={CaretLeft}
          size='md'
        />
      }
      footer={
        <Button
          block={true}
          className={'__left-btn'}
          disabled={isSubmitting || !resultList.length}
          icon={
            <Icon
              customSize='28px'
              phosphorIcon={CheckCircle}
              weight={'fill'}
            />
          }
          onClick={onConfirmButton}
        >
          {t('Confirm')}
        </Button>
      }
      id={changeVersionWalletContractModalId}
      onCancel={onCancel}
      title={t<string>('Wallet version contract')}
    >
      <div>
        <div className={'sub-title'}>
          {t('In TON ecosystem a wallet can have multi contract version. Please choose wallet version contract you want to add.')}
        </div>
        <SwList
          actionBtnIcon={<Icon phosphorIcon={FadersHorizontal} />}
          className={'wallet-version-list'}
          list={resultList}
          renderItem={renderItem}
          renderWhenEmpty={renderEmpty}
          rowGap='var(--row-gap)'
        />
      </div>
    </SwModal>
  );
};

const ChangeVersionWalletContractModal = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {
    '.wallet-version-list': {
      display: 'flex',
      flexDirection: 'column'
    },
    '.sub-title': {
      paddingBottom: token.padding,
      fontSize: token.fontSize,
      fontWeight: token.bodyFontWeight,
      lineHeight: token.lineHeight,
      textAlign: 'center',
      color: token.colorTextTertiary
    },
    '.item:not(:last-child)': {
      marginBottom: 8
    },
    '.ant-sw-modal-footer': {
      borderTop: 0
    }
  };
});

export default ChangeVersionWalletContractModal;
