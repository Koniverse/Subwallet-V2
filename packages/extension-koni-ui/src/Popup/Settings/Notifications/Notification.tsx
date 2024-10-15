// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NotificationType } from '@subwallet/extension-base/background/KoniTypes';
import { ALL_ACCOUNT_KEY } from '@subwallet/extension-base/constants';
import { _NotificationInfo, NotificationActionType, NotificationSetup, NotificationTab, WithdrawClaimNotificationMetadata } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';
import { GetNotificationParams } from '@subwallet/extension-base/types/notification';
import { AlertModal, EmptyList, PageWrapper } from '@subwallet/extension-koni-ui/components';
import { FilterTabItemType, FilterTabs } from '@subwallet/extension-koni-ui/components/FilterTabs';
import NotificationDetailModal from '@subwallet/extension-koni-ui/components/Modal/NotificationDetailModal';
import Search from '@subwallet/extension-koni-ui/components/Search';
import { BN_ZERO, CLAIM_REWARD_TRANSACTION, DEFAULT_CLAIM_REWARD_PARAMS, DEFAULT_UN_STAKE_PARAMS, DEFAULT_WITHDRAW_PARAMS, NOTIFICATION_DETAIL_MODAL, WITHDRAW_TRANSACTION } from '@subwallet/extension-koni-ui/constants';
import { DataContext } from '@subwallet/extension-koni-ui/contexts/DataContext';
import { useAlert, useDefaultNavigate, useGetChainSlugsByAccount, useSelector } from '@subwallet/extension-koni-ui/hooks';
import { useLocalStorage } from '@subwallet/extension-koni-ui/hooks/common/useLocalStorage';
import { saveNotificationSetup } from '@subwallet/extension-koni-ui/messaging';
import { getInappNotifications, markAllReadNotification, switchReadNotificationStatus } from '@subwallet/extension-koni-ui/messaging/transaction/notification';
import NotificationItem from '@subwallet/extension-koni-ui/Popup/Settings/Notifications/NotificationItem';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import { Theme, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { getTotalWidrawable, getYieldRewardTotal } from '@subwallet/extension-koni-ui/utils/notification';
import { ActivityIndicator, Button, Icon, ModalContext, SwList, SwSubHeader } from '@subwallet/react-ui';
import { SwIconProps } from '@subwallet/react-ui/es/icon';
import BigN from 'bignumber.js';
import CN from 'classnames';
import { ArrowSquareDownLeft, ArrowSquareUpRight, BellSimpleRinging, BellSimpleSlash, CheckCircle, Checks, DownloadSimple, FadersHorizontal, GearSix, Gift, ListBullets } from 'phosphor-react';
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

const alertModalId = 'notification-alert-modal';

function Component ({ className = '' }: Props): React.ReactElement<Props> {
  const { activeModal, checkActive } = useContext(ModalContext);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const goBack = useDefaultNavigate().goBack;
  const { token } = useTheme() as Theme;
  const { alertProps, closeAlert, openAlert } = useAlert(alertModalId);
  const [selectedFilterTab, setSelectedFilterTab] = useState<NotificationTab>(NotificationTab.ALL);
  const [viewDetailItem, setViewDetailItem] = useState<NotificationInfoItem | undefined>(undefined);
  const { notificationSetup } = useSelector((state: RootState) => state.settings);
  const enableNotification = notificationSetup.isEnabled;
  const [notifications, setNotifications] = useState<_NotificationInfo[]>([]);
  const { accounts, currentAccountProxy, isAllAccount } = useSelector((state: RootState) => state.accountState);
  const [currentProxyId] = useState<string | undefined>(currentAccountProxy?.id);
  const [loadingNotification, setLoadingNotification] = useState<boolean>(false);
  const isNotificationDetailModalVisible = checkActive(NOTIFICATION_DETAIL_MODAL);
  // use this to trigger get date when click read/unread
  const [isTrigger, setTrigger] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentSearchText, setCurrentSearchText] = useState<string>('');
  const [currentTimestampMs, setCurrentTimestampMs] = useState(Date.now());
  const { earningRewards, poolInfoMap, yieldPositions } = useSelector((state) => state.earning);
  const chainsByAccountType = useGetChainSlugsByAccount();

  const [, setClaimRewardStorage] = useLocalStorage(CLAIM_REWARD_TRANSACTION, DEFAULT_CLAIM_REWARD_PARAMS);
  const [, setWithdrawStorage] = useLocalStorage(WITHDRAW_TRANSACTION, DEFAULT_WITHDRAW_PARAMS);

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

  const showWarningModal = useCallback((action: string) => {
    openAlert({
      title: t('You’ve {{action}} tokens', { replace: { action: action } }),
      type: NotificationType.INFO,
      content: t('You’ve already {{action}} your tokens. Check for unread notifications to stay updated on any important', { replace: { action: action } }),
      okButton: {
        text: t('I understand'),
        onClick: closeAlert,
        icon: CheckCircle
      }
    });
  }, [closeAlert, openAlert, t]);

  const onClickItem = useCallback((item: NotificationInfoItem) => {
    return () => {
      const slug = (item.metadata as WithdrawClaimNotificationMetadata).stakingSlug;
      const totalWithdrawable = getTotalWidrawable(slug, poolInfoMap, yieldPositions, currentAccountProxy, isAllAccount, chainsByAccountType, currentTimestampMs);

      switch (item.actionType) {
        case NotificationActionType.WITHDRAW: {
          if (totalWithdrawable && BigN(totalWithdrawable).gt(BN_ZERO)) {
            const metadata = item.metadata as WithdrawClaimNotificationMetadata;

            setWithdrawStorage({
              ...DEFAULT_UN_STAKE_PARAMS,
              slug: metadata.stakingSlug,
              chain: metadata.stakingSlug.split('___')[2],
              from: item.address
            });
            switchReadNotificationStatus(item).then(() => {
              navigate('/transaction/withdraw');
            }).catch(console.error);
          } else {
            showWarningModal('withdrawn');
          }

          break;
        }

        case NotificationActionType.CLAIM: {
          const unclaimedReward = getYieldRewardTotal(slug, earningRewards, poolInfoMap, accounts, isAllAccount, currentAccountProxy, chainsByAccountType);

          if (unclaimedReward && BigN(unclaimedReward).gt(BN_ZERO)) {
            const metadata = item.metadata as WithdrawClaimNotificationMetadata;

            setClaimRewardStorage({
              ...DEFAULT_CLAIM_REWARD_PARAMS,
              slug: metadata.stakingSlug,
              chain: metadata.stakingSlug.split('___')[2],
              from: item.address
            });
            switchReadNotificationStatus(item).then(() => {
              navigate('/transaction/claim-reward');
            }).catch(console.error);
          } else {
            showWarningModal('claimed');
          }

          break;
        }
      }

      if (!item.isRead) {
        switchReadNotificationStatus(item)
          .catch(console.error)
          .finally(() => {
            setTrigger(!isTrigger);
          });
      }
    };
  }, [accounts, chainsByAccountType, currentAccountProxy, currentTimestampMs, earningRewards, isAllAccount, isTrigger, navigate, poolInfoMap, setClaimRewardStorage, setWithdrawStorage, showWarningModal, yieldPositions]);

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
        key={item.id}
        leftIcon={item.leftIcon}
        metadata={item.metadata}
        onClick={onClickItem(item)}
        onClickMoreBtn={onClickMore(item)}
        proxyId={item.proxyId}
        time={item.time}
        title={item.title}
      />
    );
  }, [onClickItem, onClickMore]);

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
    getInappNotifications({
      proxyId: currentProxyId,
      notificationTab: NotificationTab.ALL
    } as GetNotificationParams)
      .then((rs) => {
        setNotifications(rs);
      })
      .catch(console.error);
  }, [currentProxyId, isAllAccount, isTrigger]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimestampMs(Date.now());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

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
                onClickAction={onClickItem(viewDetailItem)}
                setTrigger={setTrigger}
              />
            )}
            {
              !!alertProps && (
                <AlertModal
                  modalId={alertModalId}
                  {...alertProps}
                />
              )
            }
          </>
        )
        : (
          renderEnableNotification()
        )}

    </PageWrapper>
  );
}

const Wrapper = (props: Props) => {
  const dataContext = useContext(DataContext);

  return (
    <PageWrapper
      className={CN(props.className)}
      hideLoading={true}
      resolve={dataContext.awaitStores(['earning'])}
    >
      <Component {...props} />
    </PageWrapper>
  );
};

const Notification = styled(Wrapper)<Props>(({ theme: { token } }: Props) => {
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
