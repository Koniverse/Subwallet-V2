// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountProxyType } from '@subwallet/extension-base/types';
import { detectTranslate, isSameAddress } from '@subwallet/extension-base/utils';
import { AccountNameModal, Layout, PageWrapper } from '@subwallet/extension-koni-ui/components';
import CloseIcon from '@subwallet/extension-koni-ui/components/Icon/CloseIcon';
import DualLogo from '@subwallet/extension-koni-ui/components/Logo/DualLogo';
import QrScannerErrorNotice from '@subwallet/extension-koni-ui/components/Qr/Scanner/ErrorNotice';
import { ACCOUNT_NAME_MODAL, ATTACH_ACCOUNT_MODAL } from '@subwallet/extension-koni-ui/constants/modal';
import useCompleteCreateAccount from '@subwallet/extension-koni-ui/hooks/account/useCompleteCreateAccount';
import useGoBackFromCreateAccount from '@subwallet/extension-koni-ui/hooks/account/useGoBackFromCreateAccount';
import useScanAccountQr from '@subwallet/extension-koni-ui/hooks/qr/useScanAccountQr';
import useAutoNavigateToCreatePassword from '@subwallet/extension-koni-ui/hooks/router/useAutoNavigateToCreatePassword';
import useDefaultNavigate from '@subwallet/extension-koni-ui/hooks/router/useDefaultNavigate';
import { createAccountExternalV2 } from '@subwallet/extension-koni-ui/messaging';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import { ThemeProps, ValidateState } from '@subwallet/extension-koni-ui/types';
import { QrAccount } from '@subwallet/extension-koni-ui/types/scanner';
import { qrSignerScan } from '@subwallet/extension-koni-ui/utils/scanner/attach';
import { Icon, Image, ModalContext, SwQrScanner } from '@subwallet/react-ui';
import CN from 'classnames';
import { QrCode, XCircle } from 'phosphor-react';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import styled from 'styled-components';

import DefaultLogosMap from '../../../assets/logo';

const FooterIcon = (
  <Icon
    phosphorIcon={QrCode}
    weight='fill'
  />
);

const accountNameModalId = ACCOUNT_NAME_MODAL;

interface Props extends ThemeProps {
  title: string;
  subTitle: string;
  deviceName: string;
  instructionUrl: string;
  logoUrl: string;
}

const modalId = 'attach-qr-signer-scanner-modal';

const Component: React.FC<Props> = (props: Props) => {
  useAutoNavigateToCreatePassword();

  const { className, deviceName, instructionUrl, logoUrl, subTitle, title } = props;
  const { t } = useTranslation();
  const { goHome } = useDefaultNavigate();

  const onComplete = useCompleteCreateAccount();
  const onBack = useGoBackFromCreateAccount(ATTACH_ACCOUNT_MODAL);
  const accounts = useSelector((root: RootState) => root.accountState.accounts);

  const { activeModal, inactiveModal } = useContext(ModalContext);

  const [validateState, setValidateState] = useState<ValidateState>({});
  const [loading, setLoading] = useState(false);
  const [scannedAccount, setScannedAccount] = useState<QrAccount>();

  const accountAddressValidator = useCallback((scannedAccount: QrAccount) => {
    if (scannedAccount?.content) {
      // For each account, check if the address already exists return promise reject
      for (const account of accounts) {
        // todo: Recheck this logic with master account
        if (isSameAddress(account.address, scannedAccount.content)) {
          return Promise.reject(new Error(t('Account already exists')));
        }
      }
    }

    return Promise.resolve();
  }, [accounts, t]);

  const onSubmit = useCallback((account: QrAccount) => {
    setValidateState({
      message: '',
      status: 'validating'
    });
    inactiveModal(modalId);
    accountAddressValidator(account)
      .then(() => {
        setScannedAccount(account);
      }).catch((error: Error) => {
        setValidateState({
          message: error.message,
          status: 'error'
        });
      });
  }, [accountAddressValidator, inactiveModal]);

  const onSubmitFinal = useCallback((name: string) => {
    if (scannedAccount) {
      setLoading(true);

      setTimeout(() => {
        createAccountExternalV2({
          name,
          address: scannedAccount.content,
          genesisHash: '',
          isAllowed: true,
          isReadOnly: false
        })
          .then((errors) => {
            if (errors.length) {
              setValidateState({
                message: errors[0].message,
                status: 'error'
              });
            } else {
              setValidateState({});
              onComplete();
            }
          })
          .catch((error: Error) => {
            setValidateState({
              message: error.message,
              status: 'error'
            });
          })
          .finally(() => {
            setLoading(false);
            inactiveModal(accountNameModalId);
          });
      }, 300);
    }
  }, [scannedAccount, onComplete, inactiveModal]);

  useEffect(() => {
    if (scannedAccount) {
      activeModal(accountNameModalId);
    }
  }, [scannedAccount, activeModal]);

  const { onClose, onError, onSuccess, openCamera } = useScanAccountQr(modalId, qrSignerScan, setValidateState, onSubmit);

  return (
    <PageWrapper className={CN(className)}>
      <Layout.WithSubHeaderOnly
        onBack={onBack}
        rightFooterButton={{
          children: loading ? t('Creating') : t('Scan QR code'),
          icon: FooterIcon,
          onClick: openCamera,
          loading: loading
        }}
        subHeaderIcons={[
          {
            icon: <CloseIcon />,
            onClick: goHome
          }
        ]}
        title={title}
      >
        <div className={CN('container')}>
          <div className='sub-title'>
            {subTitle}
          </div>
          <div className='logo'>
            <DualLogo
              leftLogo={(
                <Image
                  height={56}
                  shape='squircle'
                  src={DefaultLogosMap.subwallet}
                  width={56}
                />
              )}
              rightLogo={(
                <Image
                  height={56}
                  shape='squircle'
                  src={logoUrl}
                  width={56}
                />
              )}
            />
          </div>
          <div className='instruction'>
            <Trans
              components={{
                highlight: (
                  <a
                    className='link'
                    href={instructionUrl}
                    target='__blank'
                  />
                )
              }}
              i18nKey={detectTranslate('{{deviceName}} will provide you with a QR code to scan. Read <highlight>this instruction</highlight>, for more details.')}
              values={{ deviceName }}
            />
          </div>
          {
            validateState.message && (
              <div className='error-container'>
                <Icon
                  customSize='28px'
                  phosphorIcon={XCircle}
                  weight='fill'
                />
                <span className='error-content'>{validateState.message}</span>
              </div>
            )
          }
          <SwQrScanner
            className={className}
            id={modalId}
            isError={!!validateState.status}
            onClose={onClose}
            onError={onError}
            onSuccess={onSuccess}
            overlay={validateState.message && (<QrScannerErrorNotice message={validateState.message} />)}
          />
        </div>

        <AccountNameModal
          accountType={AccountProxyType.QR}
          isLoading={loading}
          onSubmit={onSubmitFinal}
        />
      </Layout.WithSubHeaderOnly>
    </PageWrapper>
  );
};

const ConnectQrSigner = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {
    '.container': {
      padding: token.padding
    },

    '.sub-title': {
      padding: `0 ${token.padding}px`,
      fontSize: token.fontSizeHeading6,
      lineHeight: token.lineHeightHeading6,
      color: token.colorTextDescription,
      textAlign: 'center'
    },

    '.logo': {
      margin: `${token.controlHeightLG}px 0`,
      '--logo-size': token.controlHeightLG + token.controlHeightXS
    },

    '.instruction': {
      padding: `0 ${token.padding}px`,
      marginBottom: token.margin,
      fontSize: token.fontSizeHeading6,
      lineHeight: token.lineHeightHeading6,
      color: token.colorTextDescription,
      textAlign: 'center'
    },

    '.link': {
      fontSize: token.fontSizeHeading6,
      lineHeight: token.lineHeightHeading6,
      color: token.colorLink,
      textDecoration: 'underline'
    },

    '.error-container': {
      color: token.colorError,
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: token.marginXXL - 2,
      justifyContent: 'center'
    },

    '.error-content': {
      marginLeft: token.marginXS,
      fontSize: token.fontSizeHeading6,
      lineHeight: token.lineHeightHeading6
    }
  };
});

export default ConnectQrSigner;
