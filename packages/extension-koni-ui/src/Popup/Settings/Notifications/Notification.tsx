// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ALL_ACCOUNT_KEY } from '@subwallet/extension-base/constants';
import { _NotificationInfo, NotificationTab } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';
import { GetNotificationParams } from '@subwallet/extension-base/types/notification';
import { EmptyList, PageWrapper } from '@subwallet/extension-koni-ui/components';
import { FilterTabItemType, FilterTabs } from '@subwallet/extension-koni-ui/components/FilterTabs';
import NotificationDetailModal from '@subwallet/extension-koni-ui/components/Modal/NotificationDetailModal';
import { NOTIFICATION_DETAIL_MODAL } from '@subwallet/extension-koni-ui/constants';
import { useDefaultNavigate, useSelector } from '@subwallet/extension-koni-ui/hooks';
import { saveNotificationSetup } from '@subwallet/extension-koni-ui/messaging';
import { getInappNotifications, markAllReadNotification } from '@subwallet/extension-koni-ui/messaging/transaction/notification';
import NotificationItem from '@subwallet/extension-koni-ui/Popup/Settings/Notifications/NotificationItem';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import { MissionInfo, Theme, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { Button, Icon, ModalContext, SwList, SwSubHeader } from '@subwallet/react-ui';
import { SwIconProps } from '@subwallet/react-ui/es/icon';
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
  CLAIM = 'yellow-7'
}

export const NotificationIconMap = {
  SEND: ArrowSquareUpRight,
  RECEIVE: ArrowSquareDownLeft,
  WITHDRAW: DownloadSimple,
  CLAIM: Gift
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
  const [currentAddress] = useState<string | undefined>(currentAccountProxy?.id);
  const [loadingNotification, setLoadingNotification] = useState<boolean>(false);
  const isNotificationDetailModalVisible = checkActive(NOTIFICATION_DETAIL_MODAL);

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
        metadata: item.metadata
      };
    }).filter(filterTabFunction).sort(sortByTimeFunc);
  }, [notifications, selectedFilterTab, token]);

  const onEnableNotification = useCallback(() => {
    const newNotificationSetup = {
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
    getInappNotifications({
      address: isAllAccount ? ALL_ACCOUNT_KEY : currentAddress,
      notificationTab: value
    } as GetNotificationParams)
      .then((rs) => {
        setNotifications(rs);
      })
      .catch(console.error);
  }, [currentAddress, isAllAccount]);

  const onClickMore = useCallback((item: NotificationInfoItem) => {
    return (e: SyntheticEvent) => {
      e.stopPropagation();
      setViewDetailItem(item);
      activeModal(NOTIFICATION_DETAIL_MODAL);
    };
  }, [activeModal]);

  const renderItem = useCallback((item: NotificationInfoItem) => {
    return (
      <NotificationItem
        actionType={item.actionType}
        address={item.address}
        backgroundColor={item.backgroundColor}
        className={'item'}
        description={item.description}
        extrinsicType={item.extrinsicType}
        id={item.id}
        isRead={item.isRead}
        leftIcon={item.leftIcon}
        metadata={item.metadata}
        onClickMoreBtn={onClickMore(item)}
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

  const searchFunc = useCallback((item: NotificationInfoItem, searchText: string) => {
    const searchTextLowerCase = searchText.toLowerCase();

    return (
      item.title?.toLowerCase().includes(searchTextLowerCase)
    );
  }, []);

  const handleSwitchClick = useCallback(() => {
    markAllReadNotification(currentAddress || ALL_ACCOUNT_KEY)
      .catch(console.error);

    getInappNotifications({
      address: isAllAccount ? ALL_ACCOUNT_KEY : currentAddress,
      notificationTab: selectedFilterTab
    } as GetNotificationParams)
      .then((rs) => {
        setNotifications(rs);
      })
      .catch(console.error);
  }, [currentAddress, isAllAccount, selectedFilterTab]);

  useEffect(() => {
    getInappNotifications({
      address: isAllAccount ? ALL_ACCOUNT_KEY : currentAddress,
      notificationTab: NotificationTab.ALL
    } as GetNotificationParams)
      .then((rs) => {
        setNotifications(rs);
      })
      .catch(console.error);
  }, [currentAddress, isAllAccount]);

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
            <SwList.Section
              actionBtnIcon={<Icon phosphorIcon={FadersHorizontal} />}
              enableSearchInput
              list={notificationItems}
              renderItem={renderItem}
              renderWhenEmpty={renderEmptyList}
              searchFunction={searchFunc}
              searchMinCharactersCount={2}
              searchPlaceholder={t<string>('Enter network name')}
            />
            {viewDetailItem && isNotificationDetailModalVisible && (
              <NotificationDetailModal
                notificationItem={viewDetailItem}
                selectedFilterTab={selectedFilterTab}
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
    }
  });
});

export default Notification;
