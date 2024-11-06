// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { toBNString } from '@subwallet/extension-base/utils';
import { DEFAULT_OFF_RAMP_PARAMS, DEFAULT_TRANSFER_PARAMS, NO_ACCOUNT_MODAL, OFF_RAMP_DATA, REDIRECT_TRANSAK_MODAL, TRANSFER_TRANSACTION } from '@subwallet/extension-web-ui/constants';
import { ScreenContext } from '@subwallet/extension-web-ui/contexts/ScreenContext';
import { useGetChainAssetInfo, useSelector } from '@subwallet/extension-web-ui/hooks';
import { RootState } from '@subwallet/extension-web-ui/stores';
import { OffRampParams, Theme, ThemeProps } from '@subwallet/extension-web-ui/types';
import { Button, ModalContext, PageIcon, SwModal } from '@subwallet/react-ui';
import CN from 'classnames';
import { XCircle } from 'phosphor-react';
import React, { useCallback, useContext, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import styled, { useTheme } from 'styled-components';
import { useLocalStorage } from 'usehooks-ts';

import { LoadingScreen } from '../components';

type Props = ThemeProps;

function Component ({ className = '' }: Props): React.ReactElement<Props> {
  const noAccountModalId = NO_ACCOUNT_MODAL;
  const redirectTransakModalId = REDIRECT_TRANSAK_MODAL;
  const { token } = useTheme() as Theme;
  // Handle Sell Token
  const { accounts } = useSelector((state: RootState) => state.accountState);
  const [, setStorage] = useLocalStorage(TRANSFER_TRANSACTION, DEFAULT_TRANSFER_PARAMS);
  const [offRampData] = useLocalStorage(OFF_RAMP_DATA, DEFAULT_OFF_RAMP_PARAMS);

  const { activeModal } = useContext(ModalContext);

  const addresses = useMemo(() => accounts.map((account) => account.address), [accounts]);
  const { isWebUI } = useContext(ScreenContext);

  const data = offRampData;
  const TokenInfo = useGetChainAssetInfo(data.slug);
  const navigate = useNavigate();

  const onOpenSellToken = useCallback((data: OffRampParams) => {
    const partnerCustomerId = data.partnerCustomerId;
    const walletAddress = data.walletAddress;
    const slug = data.slug;
    const address = partnerCustomerId;
    const bnAmount = toBNString(data.numericCryptoAmount.toString(), TokenInfo?.decimals || 0);
    const transferParams = {
      ...DEFAULT_TRANSFER_PARAMS,
      chain: TokenInfo?.originChain || '',
      destChain: TokenInfo?.originChain || '',
      asset: TokenInfo?.slug || '',
      from: address,
      defaultSlug: slug || '',
      to: walletAddress,
      value: bnAmount.toString()
    };

    setStorage(transferParams);

    if (!isWebUI) {
      navigate('/transaction/off-ramp-send-fund');
    } else {
      navigate('/home/tokens?onOpen=true');
    }
  }, [TokenInfo?.decimals, TokenInfo?.originChain, TokenInfo?.slug, setStorage, isWebUI, navigate]);

  useEffect(() => {
    if (data.orderId) {
      if (addresses.includes(data.partnerCustomerId)) {
        activeModal(redirectTransakModalId);
      } else {
        activeModal(noAccountModalId);
      }
    }
  }, [activeModal, addresses, data, redirectTransakModalId, onOpenSellToken, noAccountModalId]);

  const onClick = useCallback(() => {
    navigate('/home/tokens');
  }, [navigate]);

  const onRedirectclick = useCallback(() => {
    onOpenSellToken(data);
  }, [data, onOpenSellToken]);

  const { t } = useTranslation();
  const footerModal = useMemo(() => {
    return (
      <>
        <Button
          block={true}
          onClick={onClick}
        >
          {t('I understand')}
        </Button>
      </>
    );
  }, [onClick, t]);

    const redirectFooterModal = useMemo(() => {
    return (
      <>
        <Button
          block={true}
          onClick={onRedirectclick}
        >
          {t('I understand')}
        </Button>
      </>
    );
  }, [onRedirectclick, t]);

  return (
    <>
      <LoadingScreen />
      <SwModal
        className={CN(className)}
        footer={footerModal}
        id={noAccountModalId}
        onCancel={onClick}
        title={t('Unable to sell tokens')}
      >
        <div className={'__modal-content'}>
          <PageIcon
            color={token.colorError}
            iconProps={{
              weight: 'fill',
              phosphorIcon: XCircle
            }}
          />
          <div className='__modal-description'>
            {t('The requested account is not found in SubWallet. Re-import the account and try again')}
          </div>
        </div>
      </SwModal>
      <SwModal
        className={CN(className)}
        footer={redirectFooterModal}
        id={redirectTransakModalId}
        onCancel={onRedirectclick}
        title={t('Send token to transak')}
      >
        <div className={'__modal-content'}>
          <PageIcon
            color={token.colorError}
            iconProps={{
              weight: 'fill',
              phosphorIcon: XCircle
            }}
          />
          <div className='__modal-description'>
            {t('Send token to transak')}
          </div>
        </div>
      </SwModal>
    </>
  );
}

const OffRampLoading = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return ({
    height: '100%',
    '.__modal-content': {
      display: 'flex',
      flexDirection: 'column',
      gap: token.size,
      alignItems: 'center',
      padding: `${token.padding}px ${token.padding}px 0 ${token.padding}px`
    },

    '.ant-sw-header-center-part': {
      width: 'fit-content'
    },

    '.__modal-description': {
      textAlign: 'center',
      color: token.colorTextDescription,
      fontSize: token.fontSizeHeading6,
      lineHeight: token.lineHeightHeading6
    },

    '.__modal-user-guide': {
      marginLeft: token.marginXXS
    },

    '.ant-sw-modal-footer': {
      borderTop: 'none',
      display: 'flex',
      gap: token.sizeSM
    }
  });
});

export default OffRampLoading;
