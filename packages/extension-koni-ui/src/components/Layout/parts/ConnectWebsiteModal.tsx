// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AuthUrlInfo } from '@subwallet/extension-base/services/request-service/types';
import { AccountProxy } from '@subwallet/extension-base/types';
import { isAccountAll, isSameAddress } from '@subwallet/extension-base/utils';
import { AccountProxyItem } from '@subwallet/extension-koni-ui/components';
import ConfirmationGeneralInfo from '@subwallet/extension-koni-ui/components/Confirmation/ConfirmationGeneralInfo';
import { changeAuthorizationBlock, changeAuthorizationPerSite } from '@subwallet/extension-koni-ui/messaging';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import { Theme, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { filterAuthorizeAccountProxies, isAddressAllowedWithAuthType } from '@subwallet/extension-koni-ui/utils';
import { Button, Icon, SwModal } from '@subwallet/react-ui';
import CN from 'classnames';
import { CheckCircle, GlobeHemisphereWest, ShieldCheck, ShieldSlash, XCircle } from 'phosphor-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import styled, { useTheme } from 'styled-components';

type Props = ThemeProps & {
  id: string;
  onCancel: () => void;
  isNotConnected: boolean;
  isBlocked: boolean;
  authInfo?: AuthUrlInfo;
  url: string;
}

type ConnectIcon = {
  linkIcon?: React.ReactNode;
  linkIconBg?: string;
};

function Component ({ authInfo, className = '', id, isBlocked = true, isNotConnected = false, onCancel, url }: Props): React.ReactElement<Props> {
  const { t } = useTranslation();

  const [allowedMap, setAllowedMap] = useState<Record<string, boolean>>(authInfo?.isAllowedMap || {});
  const accountProxies = useSelector((state: RootState) => state.accountState.accountProxies);
  const currentAccountProxy = useSelector((state: RootState) => state.accountState.currentAccountProxy);
  // const [oldConnected, setOldConnected] = useState(0);
  const [isSubmit, setIsSubmit] = useState(false);
  const { token } = useTheme() as Theme;
  const _isNotConnected = isNotConnected || !authInfo;

  const handlerUpdateMap = useCallback((accountProxy: AccountProxy, oldValue: boolean) => {
    return () => {
      setAllowedMap((values) => {
        const newValues = { ...values };
        const listAddress = accountProxy.accounts.map(({ address }) => address);

        listAddress.forEach((address) => {
          const addressIsValid = isAddressAllowedWithAuthType(address, authInfo?.accountAuthTypes || []);

          addressIsValid && (newValues[address] = !oldValue);
        });

        return newValues;
      });
    };
  }, [authInfo?.accountAuthTypes]);

  const handlerSubmit = useCallback(() => {
    if (!isSubmit && authInfo?.id) {
      setIsSubmit(true);
      changeAuthorizationPerSite({ values: allowedMap, id: authInfo.id })
        .catch((e) => {
          console.log('changeAuthorizationPerSite error', e);
        }).finally(() => {
          onCancel();
          setIsSubmit(false);
        });
    }
  }, [allowedMap, authInfo?.id, isSubmit, onCancel]);

  const handlerUnblock = useCallback(() => {
    if (!isSubmit && authInfo?.id) {
      setIsSubmit(true);
      changeAuthorizationBlock({ connectedValue: true, id: authInfo.id })
        .then(() => {
          setIsSubmit(false);
        })
        .catch(console.error);
    }
  }, [authInfo?.id, isSubmit]);

  useEffect(() => {
    if (!!authInfo?.isAllowedMap && !!authInfo?.accountAuthTypes) {
      // const connected = Object.values(authInfo.isAllowedMap).filter((s) => s).length;

      const types = authInfo.accountAuthTypes;
      const allowedMap = authInfo.isAllowedMap;

      const filterType = (address: string) => {
        return isAddressAllowedWithAuthType(address, types);
      };

      const result: Record<string, boolean> = {};

      Object.entries(allowedMap)
        .filter(([address]) => filterType(address))
        .forEach(([address, value]) => {
          result[address] = value;
        });

      setAllowedMap(result);
      // setOldConnected(connected);
    } else {
      // setOldConnected(0);
      setAllowedMap({});
    }
  }, [authInfo?.accountAuthTypes, authInfo?.isAllowedMap]);

  const actionButtons = useMemo(() => {
    if (_isNotConnected) {
      return (
        <>
          <Button
            block
            icon={
              <Icon
                phosphorIcon={XCircle}
                weight='fill'
              />
            }
            loading={isSubmit}
            onClick={onCancel}
          >
            {t('Close')}
          </Button>
        </>
      );
    }

    if (isBlocked) {
      return (
        <>
          <Button
            block
            icon={
              <Icon
                phosphorIcon={XCircle}
                weight={'fill'}
              />
            }
            loading={isSubmit}
            onClick={onCancel}
            schema={'secondary'}
          >
            {t('Cancel')}
          </Button>
          <Button
            block
            icon={
              <Icon
                phosphorIcon={ShieldCheck}
                weight={'fill'}
              />
            }
            loading={isSubmit}
            onClick={handlerUnblock}
          >
            {t('Unblock')}
          </Button>
        </>
      );
    }

    return (
      <>
        <Button
          block
          icon={
            <Icon
              phosphorIcon={XCircle}
              weight={'fill'}
            />
          }
          loading={isSubmit}
          onClick={onCancel}
          schema={'secondary'}
        >
          {t('Cancel')}
        </Button>
        <Button
          block
          icon={
            <Icon
              phosphorIcon={CheckCircle}
              weight={'fill'}
            />
          }
          loading={isSubmit}
          onClick={handlerSubmit}
        >
          {t('Confirm')}
        </Button>
      </>
    );
  }, [t, _isNotConnected, handlerSubmit, handlerUnblock, isBlocked, isSubmit, onCancel]);

  const connectIconProps = useMemo<ConnectIcon>(() => {
    if (_isNotConnected) {
      return {
        linkIcon: (
          <Icon
            customSize='24px'
            phosphorIcon={GlobeHemisphereWest}
          />
        ),
        linkIconBg: token.colorWarning
      };
    }

    if (isBlocked) {
      return {
        linkIcon: <Icon
          customSize='24px'
          phosphorIcon={ShieldSlash}
        />,
        linkIconBg: token.colorError
      };
    }

    return {};
  }, [_isNotConnected, isBlocked, token]);

  const renderContent = () => {
    if (_isNotConnected) {
      return (
        <>
          <div className={'__content-heading'}>{t('Not connected to this site')}</div>
          <div className={'text-tertiary __content-text'}>
            {t('SubWallet is not connected to this site. Please find and click in the website the "Connect Wallet" button to connect.')}
          </div>
        </>
      );
    }

    if (isBlocked) {
      return (
        <>
          <div className={'__content-heading'}>{t('This site has been blocked')}</div>
          <div className={'text-tertiary __content-text'}>
            {t('This site has been previously blocked. Do you wish to unblock and grant access to it?')}
          </div>
        </>
      );
    }

    const listAccountProxy = filterAuthorizeAccountProxies(accountProxies, authInfo?.accountAuthTypes || []).map((proxy) => {
      const value = proxy.accounts.some(({ address }) => allowedMap[address]);

      return {
        ...proxy,
        value
      };
    });
    const current = listAccountProxy.find(({ id }) => isSameAddress(id, currentAccountProxy?.id || ''));

    if (current) {
      const idx = listAccountProxy.indexOf(current);

      listAccountProxy.splice(idx, 1);
      listAccountProxy.unshift(current);
    }

    return (
      <>
        <div className={CN('__number-of-select-text')}>
          {t('Your following account(s) are connected to this site')}
        </div>

        <div className={'__account-item-container'}>
          {
            listAccountProxy.map((ap) => {
              if (isAccountAll(ap.id)) {
                return null;
              }

              const isCurrent = ap.id === currentAccountProxy?.id;

              return (
                <AccountProxyItem
                  accountProxy={ap}
                  className={CN({
                    '-is-current': isCurrent
                  }, '__account-proxy-connect-item')}
                  isSelected={ap.value}
                  key={ap.id}
                  onClick={handlerUpdateMap(ap, ap.value)}
                  showUnselectIcon
                />
              );
            })
          }
        </div>
      </>
    );
  };

  return (
    <SwModal
      className={className}
      footer={actionButtons}
      id={id}
      onCancel={onCancel}
      title={t('Connect website')}
    >
      <ConfirmationGeneralInfo
        request={{
          id: url,
          url: url
        }}
        {...connectIconProps}
      />
      {renderContent()}
    </SwModal>
  );
}

export const ConnectWebsiteModal = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return ({
    '.ant-sw-modal-body': {
      display: 'flex',
      flexDirection: 'column',
      paddingBottom: 0
    },

    '.dual-logo-container': {
      paddingTop: 0
    },

    '.__domain': {
      marginBottom: token.margin
    },

    '.__content-heading': {
      fontSize: token.fontSizeHeading4,
      lineHeight: token.lineHeightHeading4
    },

    '.confirmation-general-info-container + .__content-heading': {
      paddingTop: token.paddingXS,
      textAlign: 'center',
      marginBottom: token.marginMD
    },

    '.__content-text': {
      textAlign: 'center',
      paddingLeft: token.padding,
      paddingRight: token.padding
    },

    '.__account-item-container:not(:empty)': {
      marginTop: token.margin
    },

    '.__account-item-container': {
      display: 'flex',
      flexDirection: 'column',
      gap: token.sizeXS,

      '.__account-proxy-connect-item': {
        minHeight: 52,

        '.__item-middle-part': {
          textWrap: 'nowrap',
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          fontWeight: 600,
          fontSize: token.fontSizeHeading6,
          lineHeight: token.lineHeightHeading6
        }
      }
    },

    '.account-item-with-name': {
      position: 'relative',
      cursor: 'pointer',

      '&:before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        display: 'block',
        border: '2px solid transparent',
        borderRadius: token.borderRadiusLG
      },

      '&:-is-current:before': {
        borderColor: token.colorPrimary
      }
    },

    '.account-item-with-name + .account-item-with-name': {
      marginTop: token.marginSM
    },

    '.ant-sw-modal-footer': {
      display: 'flex',
      borderTop: 0,

      '.ant-btn + .ant-btn.ant-btn': {
        marginInlineStart: token.sizeSM
      }
    }
  });
});
