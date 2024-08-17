// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AuthUrlInfo } from '@subwallet/extension-base/background/handlers/State';
import { ActionItemType, ActionModal, EmptyList, FilterModal, PageWrapper, WebsiteAccessItem } from '@subwallet/extension-koni-ui/components';
import { useDefaultNavigate, useFilterModal } from '@subwallet/extension-koni-ui/hooks';
import { changeAuthorizationAll, forgetAllSite } from '@subwallet/extension-koni-ui/messaging';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import { updateAuthUrls } from '@subwallet/extension-koni-ui/stores/utils';
import { ManageWebsiteAccessDetailParam, Theme, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { Icon, ModalContext, SwList, SwSubHeader } from '@subwallet/react-ui';
import { FadersHorizontal, GearSix, GlobeHemisphereWest, Plugs, PlugsConnected, X } from 'phosphor-react';
import React, { useCallback, useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import styled, { useTheme } from 'styled-components';

import { isEthereumAddress } from '@polkadot/util-crypto';

type Props = ThemeProps;

function getWebsiteItems (authUrlMap: Record<string, AuthUrlInfo>): AuthUrlInfo[] {
  return Object.values(authUrlMap);
}

function getAccountCount (item: AuthUrlInfo): number {
  const authType = item.accountAuthType;

  if (authType === 'evm') {
    return item.isAllowedMap ? Object.entries(item.isAllowedMap).filter(([address, rs]) => rs && isEthereumAddress(address)).length : 0;
  }

  if (authType === 'substrate') {
    return item.isAllowedMap ? Object.entries(item.isAllowedMap).filter(([address, rs]) => rs && !isEthereumAddress(address)).length : 0;
  }

  return Object.values(item.isAllowedMap).filter((i) => i).length;
}

const ACTION_MODAL_ID = 'actionModalId';
const FILTER_MODAL_ID = 'manage-website-access-filter-id';

enum FilterValue {
  SUBSTRATE = 'substrate',
  ETHEREUM = 'ethereum',
  BLOCKED = 'blocked',
  Connected = 'connected',
}

function Component ({ className = '' }: Props): React.ReactElement<Props> {
  const authUrlMap = useSelector((state: RootState) => state.settings.authUrls);
  const { activeModal, inactiveModal } = useContext(ModalContext);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const goBack = useDefaultNavigate().goBack;
  const { token } = useTheme() as Theme;
  const { filterSelectionMap, onApplyFilter, onChangeFilterOption, onCloseFilterModal, selectedFilters } = useFilterModal(FILTER_MODAL_ID);
  const filterFunction = useMemo<(item: AuthUrlInfo) => boolean>(() => {
    return (item) => {
      if (!selectedFilters.length) {
        return true;
      }

      for (const filter of selectedFilters) {
        if (filter === FilterValue.SUBSTRATE) {
          if (item.accountAuthType === 'substrate' || item.accountAuthType === 'both') {
            return true;
          }
        } else if (filter === FilterValue.ETHEREUM) {
          if (item.accountAuthType === 'evm' || item.accountAuthType === 'both') {
            return true;
          }
        } else if (filter === FilterValue.BLOCKED) {
          if (!item.isAllowed) {
            return true;
          }
        } else if (filter === FilterValue.Connected) {
          if (item.isAllowed) {
            return true;
          }
        }
      }

      return false;
    };
  }, [selectedFilters]);

  const onClickActionBtn = useCallback(() => {
    activeModal(FILTER_MODAL_ID);
  }, [activeModal]);

  const filterOptions = useMemo(() => {
    return [
      { label: t('settings.Screen.manageWebsiteAccess.Filter.substrate'), value: FilterValue.SUBSTRATE },
      { label: t('settings.Screen.manageWebsiteAccess.Filter.ethereum'), value: FilterValue.ETHEREUM },
      { label: t('settings.Screen.manageWebsiteAccess.Filter.blocked'), value: FilterValue.BLOCKED },
      { label: t('settings.Screen.manageWebsiteAccess.Filter.connected'), value: FilterValue.Connected }
    ];
  }, [t]);

  const websiteAccessItems = useMemo<AuthUrlInfo[]>(() => {
    return getWebsiteItems(authUrlMap);
  }, [authUrlMap]);

  const onOpenActionModal = useCallback(() => {
    activeModal(ACTION_MODAL_ID);
  }, [activeModal]);

  const onCloseActionModal = useCallback(() => {
    inactiveModal(ACTION_MODAL_ID);
  }, [inactiveModal]);

  const actions: ActionItemType[] = useMemo(() => {
    return [
      {
        key: 'forget-all',
        icon: X,
        iconBackgroundColor: token.colorWarning,
        title: t('settings.manageWebsiteAccess.Modal.configuration.Item.forget'),
        onClick: () => {
          forgetAllSite(updateAuthUrls).catch(console.error);
          onCloseActionModal();
        }
      },
      {
        key: 'disconnect-all',
        icon: Plugs,
        iconBackgroundColor: token['gray-3'],
        title: t('settings.manageWebsiteAccess.Modal.configuration.Item.disconnect'),
        onClick: () => {
          changeAuthorizationAll(false, updateAuthUrls).catch(console.error);
          onCloseActionModal();
        }
      },
      {
        key: 'connect-all',
        icon: PlugsConnected,
        iconBackgroundColor: token['green-6'],
        title: t('settings.manageWebsiteAccess.Modal.configuration.Item.connect'),
        onClick: () => {
          changeAuthorizationAll(true, updateAuthUrls).catch(console.error);
          onCloseActionModal();
        }
      }
    ];
  }, [onCloseActionModal, t, token]);

  const onClickItem = useCallback((item: AuthUrlInfo) => {
    return () => {
      navigate('/settings/dapp-access-edit', { state: {
        siteName: item.origin,
        origin: item.id,
        accountAuthType: item.accountAuthType || ''
      } as ManageWebsiteAccessDetailParam });
    };
  }, [navigate]);

  const renderItem = useCallback(
    (item: AuthUrlInfo) => {
      return (
        <WebsiteAccessItem
          accountCount={getAccountCount(item)}
          className={'__item'}
          domain={item.id}
          key={item.id}
          onClick={onClickItem(item)}
          siteName={item.origin || item.id}
        />
      );
    },
    [onClickItem]
  );

  const renderEmptyList = useCallback(() => {
    return (
      <EmptyList
        emptyMessage={t('emptyContent.websiteAccess.description')}
        emptyTitle={t('emptyContent.websiteAccess.title')}
        phosphorIcon={GlobeHemisphereWest}
      />
    );
  }, [t]);

  const searchFunc = useCallback((item: AuthUrlInfo, searchText: string) => {
    const searchTextLowerCase = searchText.toLowerCase();

    return (
      item.origin?.toLowerCase().includes(searchTextLowerCase) ||
      item.id?.toLowerCase().includes(searchTextLowerCase)
    );
  }, []);

  return (
    <PageWrapper className={`manage-website-access ${className}`}>
      <SwSubHeader
        background={'transparent'}
        center
        onBack={goBack}
        paddingVertical
        rightButtons={[
          {
            icon: (
              <Icon
                customSize={'24px'}
                phosphorIcon={GearSix}
                type='phosphor'
                weight={'bold'}
              />
            ),
            onClick: onOpenActionModal
          }
        ]}
        showBackButton
        title={t('settings.Screen.manageWebsiteAccess.title')}
      />

      <SwList.Section
        actionBtnIcon={<Icon phosphorIcon={FadersHorizontal} />}
        enableSearchInput
        filterBy={filterFunction}
        list={websiteAccessItems}
        onClickActionBtn={onClickActionBtn}
        renderItem={renderItem}
        renderWhenEmpty={renderEmptyList}
        searchFunction={searchFunc}
        searchMinCharactersCount={2}
        searchPlaceholder={t<string>('settings.Screen.websiteAccess.searchPlaceHolder')}
        showActionBtn
      />

      <ActionModal
        actions={actions}
        id={ACTION_MODAL_ID}
        onCancel={onCloseActionModal}
        title={t('settings.manageWebsiteAccess.Modal.accessConfiguration.title')}
      />

      <FilterModal
        id={FILTER_MODAL_ID}
        onApplyFilter={onApplyFilter}
        onCancel={onCloseFilterModal}
        onChangeOption={onChangeFilterOption}
        optionSelectionMap={filterSelectionMap}
        options={filterOptions}
        title={t('common.Text.filter')}
      />
    </PageWrapper>
  );
}

const ManageWebsiteAccess = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return ({
    height: '100%',
    backgroundColor: token.colorBgDefault,
    display: 'flex',
    flexDirection: 'column',

    '.ant-sw-list-section': {
      paddingTop: token.padding,
      flex: 1,
      marginBottom: token.margin
    },

    '.ant-sw-list-section .ant-sw-list': {
      paddingBottom: 0
    },

    '.__item + .__item': {
      marginTop: token.marginXS
    }
  });
});

export default ManageWebsiteAccess;
