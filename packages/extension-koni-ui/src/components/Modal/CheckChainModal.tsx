// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { CHECK_CHAIN_MODAL } from '@subwallet/extension-koni-ui/constants';
import { useSelector, useTranslation } from '@subwallet/extension-koni-ui/hooks';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import { Button, Icon, ModalContext, PageIcon, SwModal } from '@subwallet/react-ui';
import CN from 'classnames';
import { CheckCircle, WifiX, XCircle } from 'phosphor-react';
import React, { useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

type Props = ThemeProps;

const modalId = CHECK_CHAIN_MODAL;

const Component: React.FC<Props> = (props: Props) => {
  const { className } = props;

  const { t } = useTranslation();
  const navigate = useNavigate();

  const { inactiveModal } = useContext(ModalContext);

  const { chainInfoMap, checkChainTarget } = useSelector((state) => state.chainStore);

  const onCancel = useCallback(() => {
    inactiveModal(modalId);
  }, [inactiveModal]);

  const onConfirm = useCallback(() => {
    inactiveModal(modalId);
    const chainInfo = chainInfoMap[checkChainTarget];

    navigate(`/settings/chains/manage?chain=${chainInfo?.name}`);
  }, [chainInfoMap, checkChainTarget, inactiveModal, navigate]);

  return (
    <SwModal
      className={CN(className)}
      destroyOnClose={true}
      id={modalId}
      onCancel={onCancel}
      title={t('Update network?')}
    >
      <div className='container'>
        <div className='page-icon-container'>
          <PageIcon
            color='var(--page-icon-color)'
            iconProps={{ phosphorIcon: WifiX }}
          />
        </div>
        <div className='description'>
          {t('Your selected network might have lost connection. Try updating it by either re-enabling it or changing network provider.')}
        </div>
        <div className='footer-area'>
          <Button
            block={true}
            className='footer-button'
            icon={(
              <Icon
                phosphorIcon={XCircle}
                weight='fill'
              />
            )}
            onClick={onCancel}
            schema='secondary'
          >
            {t('Cancel')}
          </Button>
          <Button
            block={true}
            className='footer-button'
            icon={(
              <Icon
                phosphorIcon={CheckCircle}
                weight='fill'
              />
            )}
            onClick={onConfirm}
          >
            {t('Update')}
          </Button>
        </div>
      </div>
    </SwModal>
  );
};

const CheckChainModal = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {
    '.container': {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: token.size
    },

    '.page-icon-container': {
      '--page-icon-color': token.gray,
      marginTop: token.margin,
      marginBottom: token.marginXXS
    },

    '.description': {
      paddingLeft: token.padding,
      paddingRight: token.padding,
      textAlign: 'center',
      fontSize: token.fontSizeHeading6,
      lineHeight: token.lineHeightHeading6,
      color: token.colorTextDescription
    },

    '.footer-area': {
      display: 'flex',
      flexDirection: 'row',
      gap: token.sizeSM,
      width: '100%'
    },

    '.footer-button': {
      width: 172
    }
  };
});

export default CheckChainModal;
