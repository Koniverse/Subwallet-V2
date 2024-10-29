// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { ButtonProps } from '@subwallet/react-ui/es/button/button';
import type { IconProps } from 'phosphor-react';

import { AccountActions, AccountProxyType, ResponseGetAllTonWalletContractVersion } from '@subwallet/extension-base/types';
import { GeneralEmptyList } from '@subwallet/extension-koni-ui/components';
import { TON_WALLET_CONTRACT_SELECTOR_MODAL } from '@subwallet/extension-koni-ui/constants/modal';
import { useFetchChainInfo, useGetAccountByAddress, useNotification, useSelector } from '@subwallet/extension-koni-ui/hooks';
import useTranslation from '@subwallet/extension-koni-ui/hooks/common/useTranslation';
import { tonAccountChangeWalletContractVersion, tonGetAllWalletContractVersion } from '@subwallet/extension-koni-ui/messaging';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import { TonWalletContractVersion } from '@subwallet/keyring/types';
import { Button, Icon, SwList, SwModal, Tooltip } from '@subwallet/react-ui';
import CN from 'classnames';
import { CaretLeft, CheckCircle, FadersHorizontal } from 'phosphor-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';

import { TonWalletContractItem, TonWalletContractItemType } from './TonWalletContractItem';

type Props = ThemeProps & {
  onCancel?: VoidFunction;
  id: string;
  chainSlug: string;
  address: string;
  closeIcon?: React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>;
  rightIconProps?: ButtonProps;
  isShowBackButton?: boolean;
  onBack?: VoidFunction;
};

const tonWalletContractSelectorModalId = TON_WALLET_CONTRACT_SELECTOR_MODAL;
const TON_WALLET_CONTRACT_TYPES_URL = 'https://docs.ton.org/participate/wallets/contracts#how-can-wallets-be-different';

const Component: React.FC<Props> = ({ address, chainSlug, className, closeIcon = CaretLeft, isShowBackButton, onBack, onCancel, rightIconProps }: Props) => {
  const { t } = useTranslation();
  const notification = useNotification();
  const chainInfo = useFetchChainInfo(chainSlug);
  const accountProxies = useSelector((state: RootState) => state.accountState.accountProxies);
  const [tonWalletContractVersionData, setTonWalletContractVersionData] = useState<ResponseGetAllTonWalletContractVersion | null>(null);
  const accountInfo = useGetAccountByAddress(address);
  const [selectedContractVersion, setSelectedContractVersion] = useState<TonWalletContractVersion | undefined>(
    accountInfo ? accountInfo.tonContractVersion as TonWalletContractVersion : undefined
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let sync = true;

    if (accountInfo?.address) {
      tonGetAllWalletContractVersion({ address: accountInfo.address, isTestnet: chainInfo?.isTestnet }).then((result) => {
        if (sync) {
          setTonWalletContractVersionData(result);
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
  }, [accountInfo?.address, chainInfo?.isTestnet, notification]);

  const renderEmpty = useCallback(() => {
    return <GeneralEmptyList />;
  }, []);

  const resultList = useMemo((): TonWalletContractItemType[] => {
    if (!tonWalletContractVersionData?.addressMap) {
      return [];
    }

    const addressMap = tonWalletContractVersionData.addressMap;

    return Object.entries(addressMap).map(([version, address]) => {
      const validVersion = version as TonWalletContractVersion;

      return {
        version: validVersion,
        address,
        isSelected: validVersion === selectedContractVersion,
        chainSlug
      };
    });
  }, [tonWalletContractVersionData?.addressMap, selectedContractVersion, chainSlug]);

  const onClickItem = useCallback((version: TonWalletContractVersion) => {
    return () => {
      setSelectedContractVersion(version);
    };
  }, []);

  const renderItem = useCallback((item: TonWalletContractItemType) => {
    return (
      <>
        <Tooltip
          title={item.address}
        >
          <div className={'item-wrapper'}>
            <TonWalletContractItem
              className={'item'}
              key={item.version}
              onClick={onClickItem(item.version)}
              {...item}
            />
          </div>
        </Tooltip>
      </>
    );
  }, [onClickItem]);

  const onConfirmButton = useCallback(() => {
    if (accountInfo?.address && selectedContractVersion) {
      setIsSubmitting(true);

      tonAccountChangeWalletContractVersion({ proxyId: '', address: accountInfo.address, version: selectedContractVersion })
        .then((newAddress) => {
          setTimeout(() => {
            onCancel?.();
            setIsSubmitting(false);
            const selectedAccount = accountProxies.find((account) => account.id === accountInfo.proxyId);
            const isOnAccountDetailScreen = location.pathname.includes('/accounts/detail');
            const isSoloAccount = selectedAccount?.accountType === AccountProxyType.SOLO;
            const hasTonChangeWalletContractVersion = selectedAccount?.accountActions.includes(AccountActions.TON_CHANGE_WALLET_CONTRACT_VERSION);
            const shouldNavigate = isOnAccountDetailScreen && isSoloAccount && hasTonChangeWalletContractVersion;

            if (shouldNavigate) {
              navigate(`/accounts/detail/${newAddress}`);
            }
          }, 400);
        })
        .catch((e: Error) => {
          notification({
            message: e.message,
            type: 'error'
          });
        });
    }
  }, [accountInfo?.address, accountInfo?.proxyId, accountProxies, location.pathname, navigate, notification, onCancel, selectedContractVersion]);

  return (
    <SwModal
      className={CN(className, 'wallet-version-modal')}
      closable={isShowBackButton}
      closeIcon={
        <Icon
          phosphorIcon={closeIcon}
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
      id={tonWalletContractSelectorModalId}
      maskClosable={isShowBackButton}
      onCancel={onBack}
      rightIconProps={rightIconProps}
      title={t<string>('Wallet address & version')}
    >
      <div>
        <div className={'sub-title'}>
          {t('TON wallets have ')}
          <a
            href={TON_WALLET_CONTRACT_TYPES_URL}
            rel='noreferrer'
            style={{ textDecoration: 'underline' }}
            target={'_blank'}
          >multiple versions</a>
          {t(', each with its own wallet address and balance. Select a version with the address you want to get')}
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

const TonWalletContractSelectorModal = styled(Component)<Props>(({ theme: { token } }: Props) => {
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
    '.item-wrapper:not(:last-child)': {
      marginBottom: 8
    },
    '.ant-sw-modal-footer': {
      borderTop: 0
    }
  };
});

export default TonWalletContractSelectorModal;
