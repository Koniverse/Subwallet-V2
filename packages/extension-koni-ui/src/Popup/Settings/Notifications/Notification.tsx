// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ALL_ACCOUNT_KEY } from '@subwallet/extension-base/constants';
import { _NotificationInfo, NotificationSetup, NotificationTab } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';
import { GetNotificationParams } from '@subwallet/extension-base/types/notification';
import { EmptyList, PageWrapper } from '@subwallet/extension-koni-ui/components';
import { FilterTabItemType, FilterTabs } from '@subwallet/extension-koni-ui/components/FilterTabs';
import NotificationDetailModal from '@subwallet/extension-koni-ui/components/Modal/NotificationDetailModal';
import Search from '@subwallet/extension-koni-ui/components/Search';
import { NOTIFICATION_DETAIL_MODAL } from '@subwallet/extension-koni-ui/constants';
import { useDefaultNavigate, useSelector } from '@subwallet/extension-koni-ui/hooks';
import { saveNotificationSetup } from '@subwallet/extension-koni-ui/messaging';
import { getInappNotifications, markAllReadNotification } from '@subwallet/extension-koni-ui/messaging/transaction/notification';
import NotificationItem from '@subwallet/extension-koni-ui/Popup/Settings/Notifications/NotificationItem';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import { Theme, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { ActivityIndicator, Button, Icon, ModalContext, SwList, SwSubHeader } from '@subwallet/react-ui';
import { SwIconProps } from '@subwallet/react-ui/es/icon';
import CN from 'classnames';
import { ArrowSquareDownLeft, ArrowSquareUpRight, BellSimpleRinging, BellSimpleSlash, Checks, DownloadSimple, FadersHorizontal, GearSix, Gift, ListBullets } from 'phosphor-react';
import React, { SyntheticEvent, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import styled, { useTheme } from 'styled-components';

type Props = ThemeProps;

export interface NotificationInfoItem extends _NotificationInfo {
  backgroundColor: string;
  leftIcon?: SwIconProps['phosphorIcon'];
  disabled?: boolean;
}

export enum NotificationIconBackgroundColorMap {
  SEND = 'colorSuccess',
  RECEIVE = 'lime-7',
  WITHDRAW = 'blue-8',
  CLAIM = 'yellow-7',
  CLAIM_AVAIL_BRIDGE_ON_AVAIL = 'red-10', // temporary set
  CLAIM_AVAIL_BRIDGE_ON_ETHEREUM = 'red-10'
}

export const NotificationIconMap = {
  SEND: ArrowSquareUpRight,
  RECEIVE: ArrowSquareDownLeft,
  WITHDRAW: DownloadSimple,
  CLAIM: Gift,
  CLAIM_AVAIL_BRIDGE_ON_AVAIL: Gift, // temporary set
  CLAIM_AVAIL_BRIDGE_ON_ETHEREUM: Gift
};

function Component ({ className = '' }: Props): React.ReactElement<Props> {
  const { activeModal, checkActive } = useContext(ModalContext);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const goBack = useDefaultNavigate().goBack;
  const { token } = useTheme() as Theme;

  const [selectedFilterTab, setSelectedFilterTab] = useState<NotificationTab>(NotificationTab.ALL);
  const [viewDetailItem, setViewDetailItem] = useState<NotificationInfoItem | undefined>(undefined);
  const { notificationSetup } = useSelector((state: RootState) => state.settings);
  const enableNotification = notificationSetup.isEnabled;
  const [notifications, setNotifications] = useState<_NotificationInfo[]>([]);
  const { currentAccountProxy, isAllAccount } = useSelector((state: RootState) => state.accountState);
  const [currentProxyId] = useState<string | undefined>(currentAccountProxy?.id);
  const [loadingNotification, setLoadingNotification] = useState<boolean>(false);
  const isNotificationDetailModalVisible = checkActive(NOTIFICATION_DETAIL_MODAL);
  // use this to trigger get date when click read/unread
  const [isTrigger, setTrigger] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentSearchText, setCurrentSearchText] = useState<string>('');

  const notificationItems = useMemo((): NotificationInfoItem[] => {
    const filterTabFunction = (item: NotificationInfoItem) => {
      if (selectedFilterTab === NotificationTab.ALL) {
        return true;
      } else if (selectedFilterTab === NotificationTab.UNREAD) {
        return !item.isRead;
      } else {
        return item.isRead;
      }
    };

    const sortByTimeFunc = (itemA: NotificationInfoItem, itemB: NotificationInfoItem) => {
      return itemB.time - itemA.time;
    };

    return notifications.map((item) => {
      return {
        id: item.id,
        title: item.title,
        description: item.description,
        address: item.address,
        time: item.time,
        extrinsicType: item.extrinsicType,
        isRead: item.isRead,
        actionType: item.actionType,
        backgroundColor: token[NotificationIconBackgroundColorMap[item.actionType]],
        leftIcon: NotificationIconMap[item.actionType],
        metadata: item.metadata,
        proxyId: item.proxyId
      };
    }).filter(filterTabFunction).sort(sortByTimeFunc);
  }, [notifications, selectedFilterTab, token]);

  const filteredNotificationItems = useMemo(() => {
    return notificationItems.filter((item) => {
      const searchTextLowerCase = currentSearchText.toLowerCase();

      return item.title?.toLowerCase().includes(searchTextLowerCase);
    });
  }, [currentSearchText, notificationItems]);

  const onEnableNotification = useCallback(() => {
    const newNotificationSetup: NotificationSetup = {
      ...notificationSetup,
      isEnabled: true
    };

    setLoadingNotification(true);
    saveNotificationSetup(newNotificationSetup)
      .catch(console.error)
      .finally(() => {
        setLoadingNotification(false);
      });
    navigate('/settings/notification-config');
  }, [navigate, notificationSetup]);

  const handleSearch = useCallback((value: string) => {
    setCurrentSearchText(value);
  }, []);

  const onNotificationConfig = useCallback(() => {
    navigate('/settings/notification-config');
  }, [navigate]);

  const filterTabItems = useMemo<FilterTabItemType[]>(() => {
    return [
      {
        label: t('All'),
        value: NotificationTab.ALL
      },
      {
        label: t('Unread'),
        value: NotificationTab.UNREAD
      },
      {
        label: t('Read'),
        value: NotificationTab.READ
      }
    ];
  }, [t]);

  const onSelectFilterTab = useCallback((value: string) => {
    setSelectedFilterTab(value as NotificationTab);
    setLoading(true);
    getInappNotifications({
      proxyId: currentProxyId,
      notificationTab: value
    } as GetNotificationParams)
      .then((rs) => {
        setNotifications(rs);
        setTimeout(() => setLoading(false), 300);
      })
      .catch(console.error);
  }, [currentProxyId]);

  const onClickMore = useCallback((item: NotificationInfoItem) => {
    return (e: SyntheticEvent) => {
      e.stopPropagation();
      setViewDetailItem(item);
      activeModal(NOTIFICATION_DETAIL_MODAL);
    };
  }, [activeModal]);

  const onClickBack = useCallback(() => {
    setCurrentSearchText('');
    goBack();
  }, [goBack]);

  const renderItem = useCallback((item: NotificationInfoItem) => {
    return (
      <NotificationItem
        actionType={item.actionType}
        address={item.address}
        backgroundColor={item.backgroundColor}
        className={CN('item', { '-read-item': item.isRead })}
        description={item.description}
        extrinsicType={item.extrinsicType}
        id={item.id}
        isRead={item.isRead}
        leftIcon={item.leftIcon}
        metadata={item.metadata}
        onClickMoreBtn={onClickMore(item)}
        proxyId={item.proxyId}
        time={item.time}
        title={item.title}
      />
    );
  }, [onClickMore]);

  const renderEmptyList = useCallback(() => {
    return (
      <EmptyList
        emptyMessage={t('Your notification will appear here.')}
        emptyTitle={t('Have not notification yet')}
        phosphorIcon={ListBullets}
      />
    );
  }, [t]);

  const renderEnableNotification = useCallback(() => {
    return (
      <EmptyList
        buttonProps={{
          icon: (
            <Icon
              phosphorIcon={BellSimpleRinging}
              weight={'fill'}
            />),
          onClick: onEnableNotification,
          loading: loadingNotification,
          size: 'xs',
          shape: 'circle',
          children: t('Enable notification')
        }}
        emptyMessage={t('Your notification will appear here.')}
        emptyTitle={t('Notification feature is not enabled')}
        phosphorIcon={BellSimpleSlash}
      />
    );
  }, [loadingNotification, onEnableNotification, t]);

  const handleSwitchClick = useCallback(() => {
    markAllReadNotification(currentProxyId || ALL_ACCOUNT_KEY)
      .catch(console.error);

    setLoading(true);
    getInappNotifications({
      proxyId: currentProxyId,
      notificationTab: selectedFilterTab
    } as GetNotificationParams)
      .then((rs) => {
        setNotifications(rs);
        setTimeout(() => setLoading(false), 300);
      })
      .catch(console.error);
  }, [currentProxyId, selectedFilterTab]);

  useEffect(() => {
    setLoading(true);
    getInappNotifications({
      proxyId: currentProxyId,
      notificationTab: NotificationTab.ALL
    } as GetNotificationParams)
      .then((rs) => {
        setNotifications(rs);
        setTimeout(() => setLoading(false), 300);
      })
      .catch(console.error);
  }, [currentProxyId, isAllAccount, isTrigger]);

  return (
    <PageWrapper className={`manage-website-access ${className}`}>
      <SwSubHeader
        background={'transparent'}
        center
        onBack={onClickBack}
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
            onClick: onNotificationConfig
          }
        ]}
        showBackButton
        title={t('Notifications')}
      />

      <div className={'tool-area'}>
        <FilterTabs
          className={'filter-tabs-container'}
          items={filterTabItems}
          onSelect={onSelectFilterTab}
          selectedItem={selectedFilterTab}
        />
        <Button
          icon={ (
            <Icon
              phosphorIcon={Checks}
              weight={'fill'}
            />
          )}
          // TODO: This is for development. It will be removed when done.
          onClick={handleSwitchClick}
          size='xs'
          type='ghost'
        >
          {t('Mark read all')}
        </Button>
      </div>

      {enableNotification
        ? (
          <>
            <div className={'list-container-wrapper'}>
              <Search
                actionBtnIcon={<Icon phosphorIcon={FadersHorizontal} />}
                className={'__search-box'}
                onSearch={handleSearch}
                placeholder={t<string>('Enter network name')}
                searchValue={currentSearchText}
              />
              {loading
                ? <div className={'indicator-wrapper'}><ActivityIndicator size={32} /></div>
                : (
                  <SwList
                    className={'__list-container'}
                    list={filteredNotificationItems}
                    renderItem={renderItem}
                    renderWhenEmpty={renderEmptyList}
                    searchableMinCharactersCount={2}
                  />
                )}
            </div>
            {viewDetailItem && isNotificationDetailModalVisible && (
              <NotificationDetailModal
                isTrigger={isTrigger}
                notificationItem={viewDetailItem}
                setTrigger={setTrigger}
              />
            )}
          </>
        )
        : (
          renderEnableNotification()
        )}

    </PageWrapper>
  );
}

const Notification = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return ({
    height: '100%',
    backgroundColor: token.colorBgDefault,
    display: 'flex',
    flexDirection: 'column',

    '.tool-area': {
      display: 'flex',
      justifyContent: 'space-between'
    },
    '.filter-tabs-container': {
      marginLeft: token.margin
    },

    '.ant-sw-list-section': {
      paddingTop: token.padding,
      flex: 1,
      marginBottom: token.margin
    },

    '.ant-sw-list-section .ant-sw-list': {
      paddingBottom: 0
    },

    '.item + .item': {
      marginTop: token.marginXS
    },

    '.-read-item': {
      opacity: 0.4
    },

    '.list-container-wrapper': {
      paddingLeft: token.padding,
      paddingRight: token.padding,
      paddingTop: token.padding,
      paddingBottom: token.padding,
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      overflow: 'auto'
    },

    '.__list-container': {
      flex: 1,
      overflow: 'auto',

      '> div + div': {
        marginTop: token.marginXS
      }
    },

    '.__search-box': {
      marginBottom: token.marginXS
    },

    '.indicator-wrapper': {
      display: 'flex',
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center'
    }
  });
});

export default Notification;
