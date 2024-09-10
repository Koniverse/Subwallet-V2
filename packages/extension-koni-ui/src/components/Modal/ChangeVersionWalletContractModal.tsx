// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainInfo } from '@subwallet/chain-list/types';
import { AccountJson, ResponseGetAllTonWalletContractVersion } from '@subwallet/extension-base/types';
import { GeneralEmptyList } from '@subwallet/extension-koni-ui/components';
import ChangeVersionWalletConractItem from '@subwallet/extension-koni-ui/components/ChangeVersionWalletConractItem';
import { CHANGE_VERSION_WALLET_CONTRACT } from '@subwallet/extension-koni-ui/constants/modal';
import useNotification from '@subwallet/extension-koni-ui/hooks/common/useNotification';
import useTranslation from '@subwallet/extension-koni-ui/hooks/common/useTranslation';
import { tonGetAllWalletContractVersion } from '@subwallet/extension-koni-ui/messaging';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import { TonWalletContractVersion } from '@subwallet/keyring/types';
import { Button, Icon, ModalContext, SwList, SwModal } from '@subwallet/react-ui';
import CN from 'classnames';
import { CaretLeft, CheckCircle, FadersHorizontal } from 'phosphor-react';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

type Props = ThemeProps & {
  onCancel?: VoidFunction;
  id: string;
  chainInfo: _ChainInfo;
  accountInfo: AccountJson;
};

export type WalletContractItem = {
  walletType: TonWalletContractVersion,
  value: string,
  isSelected: boolean,
  chainSlug: string
}

const changeVersionWalletContractModalId = CHANGE_VERSION_WALLET_CONTRACT;

const Component: React.FC<Props> = ({ accountInfo, chainInfo, className, onCancel }: Props) => {
  const { t } = useTranslation();
  const { activeModal, inactiveModals } = useContext(ModalContext);
  const notify = useNotification();
  const [tonWalletVersionData, setTonWalletVersionData] = useState<ResponseGetAllTonWalletContractVersion | null>(null);

  useEffect(() => {
    tonGetAllWalletContractVersion({ address: accountInfo?.address }).then((result) => {
      setTonWalletVersionData(result);
    }).catch(console.error);
  }, [accountInfo?.address]);

  const renderEmpty = useCallback(() => {
    return <GeneralEmptyList />;
  }, []);

  const resultList = useMemo((): WalletContractItem[] => {
    const addressMap = tonWalletVersionData?.addressMap as Record<TonWalletContractVersion, string> ?? {};

    return Object.entries(addressMap).map(([walletType, value]) => {
      const validWalletType = walletType as TonWalletContractVersion;

      return {
        walletType: validWalletType,
        value,
        isSelected: value === accountInfo?.address,
        chainSlug: chainInfo?.slug
      };
    });
  }, [tonWalletVersionData?.addressMap, accountInfo?.address, chainInfo?.slug]);

  const renderItem = useCallback((item: WalletContractItem) => {
    return (
      <ChangeVersionWalletConractItem
        className={'item'}
        key={item.walletType}
        {...item}
      />
    );
  }, []);

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
          icon={
            <Icon
              customSize='28px'
              phosphorIcon={CheckCircle}
              weight={'fill'}
            />
          }
          onClick={onCancel}
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
          searchMinCharactersCount={2}
          // showActionBtn
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
