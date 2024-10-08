// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountAuthType } from '@subwallet/extension-base/background/types';
import { AuthUrlInfo } from '@subwallet/extension-base/services/request-service/types';
import { AccountChainType, AccountJson, AccountProxy } from '@subwallet/extension-base/types';
import { AccountProxyItem, EmptyList, Layout, PageWrapper } from '@subwallet/extension-koni-ui/components';
import { ActionItemType, ActionModal } from '@subwallet/extension-koni-ui/components/Modal/ActionModal';
import useDefaultNavigate from '@subwallet/extension-koni-ui/hooks/router/useDefaultNavigate';
import { changeAuthorization, changeAuthorizationPerSite, forgetSite, toggleAuthorization } from '@subwallet/extension-koni-ui/messaging';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import { updateAuthUrls } from '@subwallet/extension-koni-ui/stores/utils';
import { Theme, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { ManageWebsiteAccessDetailParam } from '@subwallet/extension-koni-ui/types/navigation';
import { Icon, ModalContext, Switch, SwList } from '@subwallet/react-ui';
import { GearSix, MagnifyingGlass, Plugs, PlugsConnected, ShieldCheck, ShieldSlash, X } from 'phosphor-react';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import styled, { useTheme } from 'styled-components';

type Props = ThemeProps & ManageWebsiteAccessDetailParam & {
  authInfo: AuthUrlInfo;
  goBack: () => void
};

type WrapperProps = ThemeProps;

const ActionModalId = 'actionModalId';
// const FilterModalId = 'filterModalId';

const checkAccountAddressValid = (chainType: AccountChainType, accountAuthTypes?: AccountAuthType[]): boolean => {
  if (!accountAuthTypes) {
    return false;
  }

  switch (chainType) {
    case AccountChainType.SUBSTRATE: return accountAuthTypes.includes('substrate');
    case AccountChainType.ETHEREUM: return accountAuthTypes.includes('evm');
    case AccountChainType.TON: return accountAuthTypes.includes('ton');
  }

  return false;
};

function Component ({ accountAuthTypes, authInfo, className = '', goBack, origin, siteName }: Props): React.ReactElement<Props> {
  const accountProxies = useSelector((state: RootState) => state.accountState.accountProxies);
  const [pendingMap, setPendingMap] = useState<Record<string, boolean>>({});
  const { activeModal, inactiveModal } = useContext(ModalContext);
  const { t } = useTranslation();
  const { token } = useTheme() as Theme;
  const accountProxyItems = useMemo(() => {
    return accountProxies.filter((ap) => ap.id !== 'ALL' && ap.chainTypes.some((chainType) => checkAccountAddressValid(chainType, accountAuthTypes)));
  }, [accountAuthTypes, accountProxies]);

  const onOpenActionModal = useCallback(() => {
    activeModal(ActionModalId);
  }, [activeModal]);

  const onCloseActionModal = useCallback(() => {
    inactiveModal(ActionModalId);
  }, [inactiveModal]);

  const actions: ActionItemType[] = useMemo(() => {
    const isAllowed = authInfo.isAllowed;

    const result: ActionItemType[] = [
      {
        key: isAllowed ? 'block' : 'unblock',
        icon: isAllowed ? ShieldSlash : ShieldCheck,
        iconBackgroundColor: isAllowed ? token.colorError : token.colorSuccess,
        title: isAllowed ? t('Block this site') : t('Unblock this site'),
        onClick: () => {
          toggleAuthorization(origin)
            .then(({ list }) => {
              updateAuthUrls(list);
            })
            .catch(console.error);
          onCloseActionModal();
        }
      },
      {
        key: 'forget-site',
        icon: X,
        iconBackgroundColor: token.colorWarning,
        title: t('Forget this site'),
        onClick: () => {
          forgetSite(origin, updateAuthUrls).catch(console.error);
          onCloseActionModal();
        }
      }
    ];

    if (isAllowed) {
      result.push(
        {
          key: 'disconnect-all',
          icon: Plugs,
          iconBackgroundColor: token['gray-3'],
          title: t('Disconnect all accounts'),
          onClick: () => {
            changeAuthorization(false, origin, updateAuthUrls).catch(console.error);
            onCloseActionModal();
          }
        },
        {
          key: 'connect-all',
          icon: PlugsConnected,
          iconBackgroundColor: token['green-6'],
          title: t('Connect all accounts'),
          onClick: () => {
            changeAuthorization(true, origin, updateAuthUrls).catch(console.error);
            onCloseActionModal();
          }
        }
      );
    }

    return result;
  }, [authInfo.isAllowed, onCloseActionModal, origin, t, token]);

  const renderItem = useCallback((item: AccountProxy) => {
    const isEnabled: boolean = item.accounts.some((account) => authInfo.isAllowedMap[account.address]);

    const onClick = () => {
      setPendingMap((prevMap) => {
        return {
          ...prevMap,
          [item.id]: !isEnabled
        };
      });
      const newAllowedMap = { ...authInfo.isAllowedMap };

      item.accounts.forEach((account) => {
        if (checkAccountAddressValid(account.chainType, authInfo.accountAuthTypes)) {
          newAllowedMap[account.address] = !isEnabled;
        }
      });

      changeAuthorizationPerSite({ values: newAllowedMap, id: authInfo.id })
        .catch(console.log)
        .finally(() => {
          setPendingMap((prevMap) => {
            const newMap = { ...prevMap };

            if (newMap[item.id]) {
              delete newMap[item.id];
            }

            return newMap;
          });
        });
    };

    return (
      <AccountProxyItem
        accountProxy={item}
        className={'__account-proxy-connect-item'}
        key={item.id}
        rightPartNode={(
          <Switch
            checked={pendingMap[item.id] === undefined ? isEnabled : pendingMap[item.id]}
            disabled={!authInfo.isAllowed || pendingMap[item.id] !== undefined}
            {...{ onClick }}
            style={{ marginRight: 8 }}
          />
        )}
      />
    );
  }, [authInfo.accountAuthTypes, authInfo.id, authInfo.isAllowed, authInfo.isAllowedMap, pendingMap]);

  const searchFunc = useCallback((item: AccountJson, searchText: string) => {
    const searchTextLowerCase = searchText.toLowerCase();

    return (
      item.name
        ? item.name.toLowerCase().includes(searchTextLowerCase)
        : false
    );
  }, []);

  useEffect(() => {
    setPendingMap((prevMap) => {
      if (!Object.keys(prevMap).length) {
        return prevMap;
      }

      return {};
    });
  }, [authInfo]);

  const renderEmptyList = useCallback(() => {
    return (
      <EmptyList
        emptyMessage={t('Your accounts will appear here.')}
        emptyTitle={t('No account found')}
        phosphorIcon={MagnifyingGlass}
      />
    );
  }, [t]);

  return (
    <PageWrapper className={`manage-website-access-detail ${className}`}>
      <Layout.WithSubHeaderOnly
        onBack={goBack}
        subHeaderIcons={[
          {
            icon: (
              <Icon
                phosphorIcon={GearSix}
                size='md'
                type='phosphor'
                weight='bold'
              />
            ),
            onClick: onOpenActionModal
          }
        ]}
        title={siteName || authInfo.id}
      >
        <SwList.Section
          className={'list-account-item'}
          enableSearchInput
          list={accountProxyItems}
          renderItem={renderItem}
          renderWhenEmpty={renderEmptyList}
          searchFunction={searchFunc}
          searchMinCharactersCount={2}
          searchPlaceholder={t<string>('Search account')}
        />

        <ActionModal
          actions={actions}
          className={`${className} action-modal`}
          id={ActionModalId}
          onCancel={onCloseActionModal}
          title={t('dApp configuration')}
        />
      </Layout.WithSubHeaderOnly>
    </PageWrapper>
  );
}

function WrapperComponent (props: WrapperProps) {
  const location = useLocation();
  const { accountAuthTypes, origin, siteName } = location.state as ManageWebsiteAccessDetailParam;
  const authInfo: undefined | AuthUrlInfo = useSelector((state: RootState) => state.settings.authUrls[origin]);
  const goBack = useDefaultNavigate().goBack;

  useEffect(() => {
    if (!authInfo) {
      goBack();
    }
  }, [goBack, authInfo]);

  return (
    <>
      {!!authInfo && (
        <Component
          {...props}
          accountAuthTypes={accountAuthTypes}
          authInfo={authInfo}
          goBack={goBack}
          origin={origin}
          siteName={siteName}
        />)}
    </>
  );
}

const ManageWebsiteAccessDetail = styled(WrapperComponent)<Props>(({ theme: { token } }: Props) => {
  return ({
    '.ant-sw-list-section': {
      height: '100%'
    },

    '&.manage-website-access-detail': {
      backgroundColor: token.colorBgDefault
    },

    '.__account-proxy-connect-item .__item-middle-part': {
      textWrap: 'nowrap',
      textOverflow: 'ellipsis',
      overflow: 'hidden',
      fontWeight: 600,
      fontSize: token.fontSizeHeading6,
      lineHeight: token.lineHeightHeading6
    },
    '.ant-sw-screen-layout-body': {
      paddingTop: token.paddingSM
    },

    '&.action-modal': {
      '.__action-item.block .ant-setting-item-name': {
        color: token.colorError
      }
    },

    '.list-account-item .ant-sw-list': {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  });
});

export default ManageWebsiteAccessDetail;
