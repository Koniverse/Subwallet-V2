// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import { EmptyList, PageWrapper } from '@subwallet/extension-koni-ui/components';
import { FilterTabItemType, FilterTabs } from '@subwallet/extension-koni-ui/components/FilterTabs';
import NotificationDetailModal from '@subwallet/extension-koni-ui/components/Modal/NotificationDetailModal';
import { NOTIFICATION_DETAIL_MODAL } from '@subwallet/extension-koni-ui/constants';
import { useDefaultNavigate } from '@subwallet/extension-koni-ui/hooks';
import NotificationItem from '@subwallet/extension-koni-ui/Popup/Settings/Notifications/NotificationItem';
import { Theme, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { Button, Icon, ModalContext, SwList, SwSubHeader } from '@subwallet/react-ui';
import { SwIconProps } from '@subwallet/react-ui/es/icon';
import { BellSimpleRinging, BellSimpleSlash, Checks, DownloadSimple, FadersHorizontal, GearSix, Gift, ListBullets } from 'phosphor-react';
import React, { SyntheticEvent, useCallback, useContext, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import styled, { useTheme } from 'styled-components';

type Props = ThemeProps;

export enum NotificationTab {
  ALL='all',
  UNREAD='unread',
  READ='read'
}

export interface NotificationInfo {
  id: string;
  title: string;
  description: string;
  time: number;
  notificationType: ExtrinsicType; // extrinsic type
  backgroundColor: string;
  leftIcon?: SwIconProps['phosphorIcon'];
  disabled?: boolean;
  isRead?: boolean;
}

function Component ({ className = '' }: Props): React.ReactElement<Props> {
  const { activeModal } = useContext(ModalContext);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const goBack = useDefaultNavigate().goBack;
  const { token } = useTheme() as Theme;

  const [selectedFilterTab, setSelectedFilterTab] = useState<string>(NotificationTab.ALL);
  const [viewDetailItem, setViewDetailItem] = useState<NotificationInfo | undefined>(undefined);
  const [enableNotification, setEnableNotification] = useState<boolean>(false);

  const notificationItems = useMemo((): NotificationInfo[] => {
    const sampleData: NotificationInfo[] = [{
      id: '1',
      title: '[Hieudao123] Claim 1200 DOT',
      description: 'You have 1200 DOT to claim. Please click here for claim',
      time: 1725426988201,
      notificationType: ExtrinsicType.TRANSFER_TOKEN,
      backgroundColor: token['yellow-7'],
      leftIcon: Gift
    },
    {
      id: '2',
      title: '[Hieudao123] Withdraw 200 DOT',
      description: 'You have 1200 DOT to claim. Please click here for claim',
      time: 1725426988707,
      notificationType: ExtrinsicType.STAKING_WITHDRAW,
      backgroundColor: token['blue-8'],
      leftIcon: DownloadSimple
    }
    ];

    return sampleData;
  }, [token]);

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
    setSelectedFilterTab(value);
  }, []);

  const onClickItem = useCallback((item: NotificationInfo) => {
    console.log('item', item);

    return () => {
      alert('clicked item');
    };
  }, []);

  const onClickMore = useCallback((item: NotificationInfo) => {
    return (e: SyntheticEvent) => {
      e.stopPropagation();
      setViewDetailItem(item);
      activeModal(NOTIFICATION_DETAIL_MODAL);
    };
  }, [activeModal]);

  const renderItem = useCallback(
    (item: NotificationInfo) => {
      return (
        <NotificationItem
          backgroundColor={item.backgroundColor}
          className={'__item'}
          description={item.description}
          id={item.id}
          leftIcon={item.leftIcon}
          notificationType={item.notificationType}
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

  const searchFunc = useCallback((item: NotificationInfo, searchText: string) => {
    const searchTextLowerCase = searchText.toLowerCase();

    return (
      item.title?.toLowerCase().includes(searchTextLowerCase)
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
            onClick: onNotificationConfig
          }
        ]}
        showBackButton
        title={t('Notifications')}
      />

      <div className={'__tool-area'}>
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
          onClick={() => {
            alert('Mark read all clicked!');
          }}
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

    '.__tool-area': {
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

    '.__item + .__item': {
      marginTop: token.marginXS
    }
  });
});

export default Notification;
