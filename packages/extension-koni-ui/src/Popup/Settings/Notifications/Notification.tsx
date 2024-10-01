// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ALL_ACCOUNT_KEY } from '@subwallet/extension-base/constants';
import { NotificationInfo, NotificationTab } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';
import { GetNotificationParams } from '@subwallet/extension-base/types/notification';
import { EmptyList, PageWrapper } from '@subwallet/extension-koni-ui/components';
import { FilterTabItemType, FilterTabs } from '@subwallet/extension-koni-ui/components/FilterTabs';
import NotificationDetailModal from '@subwallet/extension-koni-ui/components/Modal/NotificationDetailModal';
import { NOTIFICATION_DETAIL_MODAL } from '@subwallet/extension-koni-ui/constants';
import { useDefaultNavigate, useSelector } from '@subwallet/extension-koni-ui/hooks';
import { saveEnableNotification } from '@subwallet/extension-koni-ui/messaging';
import { getInappNotifications, markAllReadNotification } from '@subwallet/extension-koni-ui/messaging/transaction/notification';
import NotificationItem from '@subwallet/extension-koni-ui/Popup/Settings/Notifications/NotificationItem';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import { Theme, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { Button, Icon, ModalContext, SwList, SwSubHeader } from '@subwallet/react-ui';
import { SwIconProps } from '@subwallet/react-ui/es/icon';
import { BellSimpleRinging, BellSimpleSlash, Checks, DownloadSimple, FadersHorizontal, GearSix, ListBullets } from 'phosphor-react';
import React, { SyntheticEvent, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import styled, { useTheme } from 'styled-components';

type Props = ThemeProps;

export interface NotificationInfoItem extends NotificationInfo {
  backgroundColor: string;
  leftIcon?: SwIconProps['phosphorIcon'];
  disabled?: boolean;
}

function Component ({ className = '' }: Props): React.ReactElement<Props> {
  const { activeModal } = useContext(ModalContext);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const goBack = useDefaultNavigate().goBack;
  const { token } = useTheme() as Theme;

  const [selectedFilterTab, setSelectedFilterTab] = useState<NotificationTab>(NotificationTab.ALL);
  const [viewDetailItem, setViewDetailItem] = useState<NotificationInfoItem | undefined>(undefined);
  const { enableNotification: isEnableNotification } = useSelector((state: RootState) => state.settings);
  const [enableNotification, setEnableNotification] = useState<boolean>(isEnableNotification);
  const [notifications, setNotifications] = useState<NotificationInfo[]>([]);
  const { currentAccount, isAllAccount } = useSelector((state: RootState) => state.accountState);
  const [currentAddress] = useState<string | undefined>(currentAccount?.address);
  const [currentNotificationTab, setCurrentNotificationTab] = useState<NotificationTab>(NotificationTab.ALL);

  const unreadNotificationCount = useSelector((state) => state.notification.unreadNotificationCount);

  console.log('unreadNotificationCount', unreadNotificationCount);

  const notificationItems = useMemo((): NotificationInfoItem[] => {
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
        backgroundColor: token['red-10'],
        leftIcon: DownloadSimple
      } as unknown as NotificationInfoItem;
    });
  }, [notifications, token]);

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

  const onSelectFilterTab = useCallback((value: NotificationTab) => {
    setSelectedFilterTab(value);
    setCurrentNotificationTab(value);
    getInappNotifications({
      address: isAllAccount ? ALL_ACCOUNT_KEY : currentAddress,
      notificationTab: value // todo: set this corresponding to selected tab
    } as GetNotificationParams)
      .then((rs) => {
        setNotifications(rs);
      })
      .catch();
  }, [currentAddress, isAllAccount]);

  const onClickItem = useCallback((item: NotificationInfoItem) => {
    return () => {
      alert('clicked item');
    };
  }, []);

  const onClickMore = useCallback((item: NotificationInfoItem) => {
    return (e: SyntheticEvent) => {
      e.stopPropagation();
      setViewDetailItem(item);
      activeModal(NOTIFICATION_DETAIL_MODAL);
    };
  }, [activeModal]);

  const renderItem = useCallback(
    (item: NotificationInfoItem) => {
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
          onClick={onClickItem(item)}
          onClickMoreBtn={onClickMore(item)}
          time={item.time}
          title={item.title}
        />
      );
    },
    [onClickItem, onClickMore]
  );

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
          onClick: () => {
            setEnableNotification(!enableNotification);
            saveEnableNotification(!enableNotification)
              .catch(console.error);
          },
          size: 'xs',
          shape: 'circle',
          children: t('Enable notification')
        }}
        emptyMessage={t('Your notification will appear here.')}
        emptyTitle={t('Notification feature is not enabled')}
        phosphorIcon={BellSimpleSlash}
      />
    );
  }, [enableNotification, t]);

  const searchFunc = useCallback((item: NotificationInfoItem, searchText: string) => {
    const searchTextLowerCase = searchText.toLowerCase();

    return (
      item.title?.toLowerCase().includes(searchTextLowerCase)
    );
  }, []);

  const handleSwitchClick = useCallback(async () => {
    await markAllReadNotification(currentAddress || ALL_ACCOUNT_KEY);

    getInappNotifications({
      address: isAllAccount ? ALL_ACCOUNT_KEY : currentAddress,
      notificationTab: currentNotificationTab // todo: set this corresponding to selected tab
    } as GetNotificationParams)
      .then((rs) => {
        setNotifications(rs);
      })
      .catch();
  }, [currentNotificationTab, currentAddress]);

  useEffect(() => {
    getInappNotifications({
      address: isAllAccount ? ALL_ACCOUNT_KEY : currentAddress,
      notificationTab: NotificationTab.ALL
    } as GetNotificationParams)
      .then((rs) => {
        setNotifications(rs);
      })
      .catch();
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
            {viewDetailItem && (
              <NotificationDetailModal notificationItem={viewDetailItem} />
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
