// Copyright 2019-2022 @subwallet/extension-web-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountJson } from '@subwallet/extension-base/types';
import { AccountProxyBriefInfo } from '@subwallet/extension-web-ui/components';
import { SELECT_ACCOUNT_MODAL } from '@subwallet/extension-web-ui/constants';
import { useGetCurrentAuth, useGetCurrentTab, useIsPopup, useTranslation } from '@subwallet/extension-web-ui/hooks';
import { RootState } from '@subwallet/extension-web-ui/stores';
import { Theme } from '@subwallet/extension-web-ui/themes';
import { ThemeProps } from '@subwallet/extension-web-ui/types';
import { funcSortByName, isAccountAll, isAddressAllowedWithAuthType } from '@subwallet/extension-web-ui/utils';
import { BackgroundIcon, Icon, ModalContext, Tooltip } from '@subwallet/react-ui';
import CN from 'classnames';
import { CaretDown, Plug, Plugs, PlugsConnected } from 'phosphor-react';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import styled, { useTheme } from 'styled-components';

import { ConnectWebsiteModal } from '../ConnectWebsiteModal';
import { AccountSelectorModal } from './AccountSelectorModal';

type Props = ThemeProps

enum ConnectionStatement {
  NOT_CONNECTED='not-connected',
  CONNECTED='connected',
  PARTIAL_CONNECTED='partial-connected',
  DISCONNECTED='disconnected',
  BLOCKED='blocked'
}

const iconMap = {
  [ConnectionStatement.NOT_CONNECTED]: Plug,
  [ConnectionStatement.CONNECTED]: PlugsConnected,
  [ConnectionStatement.PARTIAL_CONNECTED]: PlugsConnected,
  [ConnectionStatement.DISCONNECTED]: Plugs,
  [ConnectionStatement.BLOCKED]: Plugs
};

const ConnectWebsiteId = 'connectWebsiteId';

const modalId = SELECT_ACCOUNT_MODAL;

function Component ({ className }: Props): React.ReactElement<Props> {
  const { t } = useTranslation();
  const { activeModal, inactiveModal } = useContext(ModalContext);

  const { accounts: _accounts, currentAccount, currentAccountProxy, isAllAccount } = useSelector((state: RootState) => state.accountState);

  const [connected, setConnected] = useState(0);
  const [canConnect, setCanConnect] = useState(0);
  const [connectionState, setConnectionState] = useState<ConnectionStatement>(ConnectionStatement.NOT_CONNECTED);
  const currentTab = useGetCurrentTab();
  const isCurrentTabFetched = !!currentTab;
  const currentAuth = useGetCurrentAuth();
  const isPopup = useIsPopup();
  const { token } = useTheme() as Theme;
  const [isAccountSelectorOpen, setIsAccountSelectorOpen] = useState(false);

  const accounts = useMemo((): AccountJson[] => {
    const result = [..._accounts].sort(funcSortByName);
    const all = result.find((acc) => isAccountAll(acc.address));

    if (all) {
      const index = result.indexOf(all);

      result.splice(index, 1);
      result.unshift(all);
    }

    if (!!currentAccount?.address && (currentAccount?.address !== (all && all.address))) {
      const currentAccountIndex = result.findIndex((item) => {
        return item.address === currentAccount?.address;
      });

      if (currentAccountIndex > -1) {
        const _currentAccount = result[currentAccountIndex];

        result.splice(currentAccountIndex, 1);
        result.splice(1, 0, _currentAccount);
      }
    }

    return result;
  }, [_accounts, currentAccount?.address]);

  // todo: migrate this logic for export all account feature after unified account feature
  // @ts-ignore
  const filteredListExportAccount = useMemo(() => {
    const accountList = accounts.filter((accountExport) => !accountExport.isInjected);

    if (accountList.length === 1 && isAccountAll(accountList[0].address)) {
      return [];
    }

    if (accountList.length === 2) {
      return accountList.filter((acc) => !isAccountAll(acc.address));
    }

    return accountList;
  }, [accounts]);

  const noAllAccounts = useMemo(() => {
    return accounts.filter(({ address }) => !isAccountAll(address));
  }, [accounts]);

  useEffect(() => {
    if (currentAuth) {
      if (!currentAuth.isAllowed) {
        setCanConnect(0);
        setConnected(0);
        setConnectionState(ConnectionStatement.BLOCKED);
      } else {
        const types = currentAuth.accountAuthTypes || ['substrate'];
        const allowedMap = currentAuth.isAllowedMap;

        const filterType = (address: string) => {
          return isAddressAllowedWithAuthType(address, types);
        };

        let accountToCheck = noAllAccounts;

        if (!isAllAccount && currentAccountProxy) {
          accountToCheck = [...(currentAccountProxy.accounts)];
        }

        const idProxiesCanConnect = new Set<string>();
        const allowedIdProxies = new Set<string>();

        accountToCheck.forEach(({ address, proxyId }) => {
          if (filterType(address) && proxyId) {
            idProxiesCanConnect.add(proxyId);
          }
        });
        Object.entries(allowedMap)
          .forEach(([address, value]) => {
            if (filterType(address)) {
              const account = accountToCheck.find(({ address: accAddress }) => accAddress === address);

              if (account?.proxyId && value) {
                allowedIdProxies.add(account.proxyId);
              }
            }
          });

        const numberAllowedAccountProxies = allowedIdProxies.size;
        const numberAllAccountProxiesCanConnect = idProxiesCanConnect.size;

        if (numberAllAccountProxiesCanConnect === 0) {
          setCanConnect(0);
          setConnected(0);
          setConnectionState(ConnectionStatement.NOT_CONNECTED);

          return;
        }

        setConnected(numberAllowedAccountProxies);
        setCanConnect(numberAllAccountProxiesCanConnect);

        if (numberAllowedAccountProxies === 0) {
          setConnectionState(ConnectionStatement.DISCONNECTED);
        } else {
          if (numberAllowedAccountProxies > 0 && numberAllowedAccountProxies < numberAllAccountProxiesCanConnect) {
            setConnectionState(ConnectionStatement.PARTIAL_CONNECTED);
          } else {
            setConnectionState(ConnectionStatement.CONNECTED);
          }
        }
      }
    } else {
      setCanConnect(0);
      setConnected(0);
      setConnectionState(ConnectionStatement.NOT_CONNECTED);
    }
  }, [currentAccountProxy, currentAuth, isAllAccount, noAllAccounts]);

  const visibleText = useMemo((): string => {
    switch (connectionState) {
      case ConnectionStatement.CONNECTED:
      // eslint-disable-next-line padding-line-between-statements, no-fallthrough
      case ConnectionStatement.PARTIAL_CONNECTED:
        if (isAllAccount) {
          return t('Connected {{connected}}/{{canConnect}}', { replace: { connected, canConnect } });
        } else {
          return t('Connected');
        }

      case ConnectionStatement.DISCONNECTED:
        return t('Disconnected');

      case ConnectionStatement.BLOCKED:
        return t('Blocked');

      case ConnectionStatement.NOT_CONNECTED:
      default:
        return t('Not connected');
    }
  }, [canConnect, connected, connectionState, isAllAccount, t]);

  const onOpenConnectWebsiteModal = useCallback(() => {
    if (isCurrentTabFetched) {
      activeModal(ConnectWebsiteId);
    }
  }, [activeModal, isCurrentTabFetched]);

  const onCloseConnectWebsiteModal = useCallback(() => {
    inactiveModal(ConnectWebsiteId);
  }, [inactiveModal]);

  const onOpenSelectAccountModal = useCallback(() => {
    setIsAccountSelectorOpen(true);
    activeModal(modalId);
  }, [activeModal]);

  const selectedAccountNode = (() => {
    if (!currentAccountProxy) {
      return null;
    }

    return (
      <div
        className={CN('selected-account', {
          'is-no-all-account': !isAccountAll(currentAccountProxy.id)
        })}
        onClick={onOpenSelectAccountModal}
      >
        <AccountProxyBriefInfo accountProxy={currentAccountProxy} />
        <Icon
          className={'__caret-icon'}
          customSize={'12px'}
          iconColor={token.colorTextSecondary}
          phosphorIcon={CaretDown}
          weight={'bold'}
        />
      </div>
    );
  })();

  return (
    <div className={CN(className, 'container')}>
      {isPopup && (
        <Tooltip
          placement={'bottomLeft'}
          title={visibleText}
        >
          <div
            className={CN('connect-icon', `-${connectionState}`)}
            onClick={onOpenConnectWebsiteModal}
          >
            <BackgroundIcon
              backgroundColor='var(--bg-color)'
              phosphorIcon={iconMap[connectionState]}
              shape='circle'
              size='sm'
              type='phosphor'
              weight={'fill'}
            />
          </div>
        </Tooltip>
      )}

      {selectedAccountNode}

      {
        isAccountSelectorOpen && (
          <AccountSelectorModal />
        )
      }

      <ConnectWebsiteModal
        authInfo={currentAuth}
        id={ConnectWebsiteId}
        isBlocked={connectionState === ConnectionStatement.BLOCKED}
        isNotConnected={connectionState === ConnectionStatement.NOT_CONNECTED}
        onCancel={onCloseConnectWebsiteModal}
        url={currentTab?.url || ''}
      />
    </div>
  );
}

const SelectAccount = styled(Component)<Props>(({ theme }) => {
  const { token } = theme as Theme;

  return ({
    '&.container': {
      paddingLeft: token.sizeSM,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'row',

      '.ant-select-modal-input-container.ant-select-modal-input-border-round::before': {
        display: 'none'
      },

      '.ant-select-modal-input-container.ant-select-modal-input-size-small .ant-select-modal-input-wrapper': {
        paddingLeft: 0
      },

      '.ant-select-modal-input-container:hover .account-name': {
        color: token.colorTextLight3
      }
    },
    '&.-tooltip-mobile': {
      left: '193px',
      top: '46px'
    },

    '&.ant-sw-modal': {
      '.ant-sw-modal-body': {
        minHeight: 370,
        marginBottom: 0
      },

      '.ant-sw-list-search-input': {
        paddingBottom: token.paddingXS
      },

      '.ant-sw-modal-footer': {
        marginTop: 0,
        borderTopColor: 'rgba(33, 33, 33, 0.80)'
      },

      '.ant-account-card': {
        padding: token.paddingSM
      },

      '.ant-web3-block .ant-web3-block-middle-item': {
        textAlign: 'initial'
      },

      '.all-account-selection': {
        cursor: 'pointer',
        borderRadius: token.borderRadiusLG,
        transition: `background ${token.motionDurationMid} ease-in-out`,

        '.account-item-name': {
          fontSize: token.fontSizeHeading5,
          lineHeight: token.lineHeightHeading5
        },

        '&:hover': {
          background: token.colorBgInput
        }
      },

      '.ant-account-card-name': {
        textOverflow: 'ellipsis',
        overflow: 'hidden',
        'white-space': 'nowrap',
        maxWidth: 120
      },

      '.ant-input-container .ant-input': {
        color: token.colorTextLight1
      }
    },
    '&.-disable-export': {
      opacity: 0.4,
      cursor: 'not-allowed'
    },
    '.__tooltip-export-wrapper': {
      display: 'flex',
      position: 'relative'
    },
    '.-icon-highlight': {
      position: 'absolute',
      top: '-90%',
      right: '-40%'
    },

    '.all-account-item': {
      display: 'flex',
      padding: `${token.paddingSM + 2}px ${token.paddingSM}px`,
      cursor: 'pointer',
      backgroundColor: token.colorBgSecondary,
      borderRadius: token.borderRadiusLG,
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: token.sizeXS,

      '&:hover': {
        backgroundColor: token.colorBgInput
      },

      '.selected': {
        color: token['cyan-6']
      }
    },

    '.ant-select-modal-input-container': {
      overflow: 'hidden'
    },

    '.selected-account': {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8
    },

    '.anticon.__export-remind-btn': {
      height: 23,
      width: 24
    },

    '.connect-icon': {
      color: token.colorTextBase,
      width: 40,
      height: 40,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      cursor: 'pointer',

      [`&.-${ConnectionStatement.DISCONNECTED}`]: {
        '--bg-color': token['gray-3']
      },

      [`&.-${ConnectionStatement.BLOCKED}`]: {
        '--bg-color': token.colorError
      },

      [`&.-${ConnectionStatement.NOT_CONNECTED}`]: {
        '--bg-color': token['gray-3']
      },

      [`&.-${ConnectionStatement.CONNECTED}`]: {
        '--bg-color': token['green-6']
      },

      [`&.-${ConnectionStatement.PARTIAL_CONNECTED}`]: {
        '--bg-color': token.colorWarning
      }
    }
  });
});

export default SelectAccount;
