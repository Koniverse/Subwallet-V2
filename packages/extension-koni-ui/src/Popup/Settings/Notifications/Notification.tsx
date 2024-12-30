// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { COMMON_CHAIN_SLUGS } from '@subwallet/chain-list';
import { NotificationType } from '@subwallet/extension-base/background/KoniTypes';
import { ALL_ACCOUNT_KEY } from '@subwallet/extension-base/constants';
import { _POLYGON_BRIDGE_ABI } from '@subwallet/extension-base/koni/api/contract-handler/utils';
import { isClaimedPosBridge } from '@subwallet/extension-base/services/balance-service/transfer/xcm/posBridge';
import { _NotificationInfo, BridgeTransactionStatus, ClaimAvailBridgeNotificationMetadata, ClaimPolygonBridgeNotificationMetadata, NotificationActionType, NotificationSetup, NotificationTab, WithdrawClaimNotificationMetadata } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';
import { GetNotificationParams, RequestSwitchStatusParams } from '@subwallet/extension-base/types/notification';
import { detectTranslate } from '@subwallet/extension-base/utils';
import { AlertModal, EmptyList, PageWrapper } from '@subwallet/extension-koni-ui/components';
import { FilterTabItemType, FilterTabs } from '@subwallet/extension-koni-ui/components/FilterTabs';
import NotificationDetailModal from '@subwallet/extension-koni-ui/components/Modal/NotificationDetailModal';
import Search from '@subwallet/extension-koni-ui/components/Search';
import { BN_ZERO, CLAIM_BRIDGE_TRANSACTION, CLAIM_REWARD_TRANSACTION, DEFAULT_CLAIM_AVAIL_BRIDGE_PARAMS, DEFAULT_CLAIM_REWARD_PARAMS, DEFAULT_UN_STAKE_PARAMS, DEFAULT_WITHDRAW_PARAMS, NOTIFICATION_DETAIL_MODAL, WITHDRAW_TRANSACTION } from '@subwallet/extension-koni-ui/constants';
import { DataContext } from '@subwallet/extension-koni-ui/contexts/DataContext';
import { useAlert, useDefaultNavigate, useGetChainSlugsByAccount, useSelector } from '@subwallet/extension-koni-ui/hooks';
import { useLocalStorage } from '@subwallet/extension-koni-ui/hooks/common/useLocalStorage';
import { enableChain, saveNotificationSetup } from '@subwallet/extension-koni-ui/messaging';
import { fetchInappNotifications, getIsClaimNotificationStatus, markAllReadNotification, switchReadNotificationStatus } from '@subwallet/extension-koni-ui/messaging/transaction/notification';
import NotificationItem from '@subwallet/extension-koni-ui/Popup/Settings/Notifications/NotificationItem';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import { Theme, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { getTotalWidrawable, getYieldRewardTotal } from '@subwallet/extension-koni-ui/utils/notification';
import { ActivityIndicator, Button, Icon, ModalContext, SwList, SwSubHeader } from '@subwallet/react-ui';
import { SwIconProps } from '@subwallet/react-ui/es/icon';
import BigN from 'bignumber.js';
import CN from 'classnames';
import { ArrowSquareDownLeft, ArrowSquareUpRight, BellSimpleRinging, BellSimpleSlash, CheckCircle, Checks, Coins, DownloadSimple, FadersHorizontal, GearSix, Gift, ListBullets, XCircle } from 'phosphor-react';
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
  CLAIM_AVAIL_BRIDGE_ON_AVAIL = 'yellow-7', // temporary set
  CLAIM_AVAIL_BRIDGE_ON_ETHEREUM = 'yellow-7',
  CLAIM_POLYGON_BRIDGE = 'yellow-7'
}

export const NotificationIconMap = {
  SEND: ArrowSquareUpRight,
  RECEIVE: ArrowSquareDownLeft,
  WITHDRAW: DownloadSimple,
  CLAIM: Gift,
  CLAIM_AVAIL_BRIDGE_ON_AVAIL: Coins, // temporary set
  CLAIM_AVAIL_BRIDGE_ON_ETHEREUM: Coins,
  CLAIM_POLYGON_BRIDGE: Coins
};

const alertModalId = 'notification-alert-modal';

function Component ({ className = '' }: Props): React.ReactElement<Props> {
  const { activeModal, checkActive } = useContext(ModalContext);

  const { t } = useTranslation();
  const navigate = useNavigate();
  const { goBack } = useDefaultNavigate();
  const { token } = useTheme() as Theme;
  const { alertProps, closeAlert, openAlert, updateAlertProps } = useAlert(alertModalId);
  const chainsByAccountType = useGetChainSlugsByAccount();

  const [, setClaimRewardStorage] = useLocalStorage(CLAIM_REWARD_TRANSACTION, DEFAULT_CLAIM_REWARD_PARAMS);
  const [, setWithdrawStorage] = useLocalStorage(WITHDRAW_TRANSACTION, DEFAULT_WITHDRAW_PARAMS);
  const [, setClaimAvailBridgeStorage] = useLocalStorage(CLAIM_BRIDGE_TRANSACTION, DEFAULT_CLAIM_AVAIL_BRIDGE_PARAMS);

  const { notificationSetup } = useSelector((state: RootState) => state.settings);
  const { accounts, currentAccountProxy, isAllAccount } = useSelector((state: RootState) => state.accountState);
  const { earningRewards, poolInfoMap, yieldPositions } = useSelector((state) => state.earning);
  const { chainInfoMap, chainStateMap } = useSelector((state) => state.chainStore);

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

  const [selectedFilterTab, setSelectedFilterTab] = useState<NotificationTab>(NotificationTab.ALL);
  const [viewDetailItem, setViewDetailItem] = useState<NotificationInfoItem | undefined>(undefined);
  const [notifications, setNotifications] = useState<_NotificationInfo[]>([]);
  const [currentProxyId] = useState<string | undefined>(currentAccountProxy?.id);
  const [loadingNotification, setLoadingNotification] = useState<boolean>(false);
  const [isTrigger, setTrigger] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentSearchText, setCurrentSearchText] = useState<string>('');
  // use this to trigger get date when click read/unread
  const [currentTimestampMs, setCurrentTimestampMs] = useState(Date.now());

  const enableNotification = notificationSetup.isEnabled;
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

  const onSelectFilterTab = useCallback((value: string) => {
    setSelectedFilterTab(value as NotificationTab);
    setLoading(true);
    fetchInappNotifications({
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

  const showActiveChainModal = useCallback((chainSlug: string, action: NotificationActionType.WITHDRAW | NotificationActionType.CLAIM) => {
    const onOk = () => {
      updateAlertProps({
        okLoading: true,
        cancelDisabled: true
      });

      enableChain(chainSlug, false)
        .then(() => {
          setTimeout(() => {
            updateAlertProps({
              okLoading: false,
              cancelDisabled: false
            });
            closeAlert();
          }, 2000);
        })
        .catch(() => {
          updateAlertProps({
            okLoading: false,
            cancelDisabled: false
          });
        });
    };

    const chainInfo = chainInfoMap[chainSlug];

    const content = action === NotificationActionType.WITHDRAW
      ? detectTranslate('{{networkName}} network is currently disabled. Enable the network and then re-click the notification to start withdrawing your funds')
      : detectTranslate('{{networkName}} network is currently disabled. Enable the network and then re-click the notification to start claiming your funds');

    openAlert({
      title: t('Enable network'),
      type: NotificationType.WARNING,
      content: t(content, { replace: { networkName: chainInfo?.name || chainSlug } }),
      closable: false,
      maskClosable: false,
      cancelButton: {
        icon: XCircle,
        onClick: closeAlert,
        schema: 'secondary',
        text: t('Cancel')
      },
      okButton: {
        icon: CheckCircle,
        onClick: onOk,
        text: t('Enable')
      }
    });
  }, [closeAlert, openAlert, t, updateAlertProps, chainInfoMap]);

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
      const switchStatusParams: RequestSwitchStatusParams = {
        id: item.id,
        isRead: false
      };

      // Check chain active status before navigate
      switch (item.actionType) {
        case NotificationActionType.WITHDRAW: {
          const metadata = item.metadata as WithdrawClaimNotificationMetadata;

          const chainSlug = metadata.stakingSlug.split('___')[2];

          if (chainStateMap[chainSlug]?.active) {
            break;
          } else {
            showActiveChainModal(chainSlug, item.actionType);

            return;
          }
        }
      }

      // Check data available before navigate
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
            switchReadNotificationStatus(switchStatusParams).then(() => {
              navigate('/transaction/withdraw');
            }).catch(console.error);
          } else {
            showWarningModal('withdrawn');
          }

          break;
        }

        case NotificationActionType.CLAIM: {
          const unclaimedReward = getYieldRewardTotal(slug, earningRewards, poolInfoMap, accounts, isAllAccount, currentAccountProxy, chainsByAccountType);
          const metadata = item.metadata as WithdrawClaimNotificationMetadata;
          const chainSlug = metadata.stakingSlug.split('___')[2];

          if (unclaimedReward && BigN(unclaimedReward).gt(BN_ZERO)) {
            setClaimRewardStorage({
              ...DEFAULT_CLAIM_REWARD_PARAMS,
              slug: metadata.stakingSlug,
              chain: chainSlug,
              from: item.address
            });
            switchReadNotificationStatus(switchStatusParams).then(() => {
              navigate('/transaction/claim-reward');
            }).catch(console.error);
          } else {
            if (chainStateMap[chainSlug]?.active) {
              showWarningModal('claimed');
            } else {
              showActiveChainModal(chainSlug, item.actionType);

              return;
            }
          }

          break;
        }

        case NotificationActionType.CLAIM_POLYGON_BRIDGE: {
          const handleClaimPolygonBridge = async () => {
            try {
              const metadata = item.metadata as ClaimPolygonBridgeNotificationMetadata;
              let isClaimed = false;

              if (metadata.bridgeType === 'POS') {
                const isTestnet = metadata.chainSlug === COMMON_CHAIN_SLUGS.ETHEREUM_SEPOLIA;

                isClaimed = await isClaimedPosBridge(metadata._id, metadata.userAddress, isTestnet) || false;
              } else {
                isClaimed = await getIsClaimNotificationStatus({ chainslug: metadata.chainSlug, counter: metadata.counter ?? 0, sourceNetwork: metadata.sourceNetwork ?? 0 });
              }

              if (!isClaimed) {
                setClaimAvailBridgeStorage({
                  chain: metadata.chainSlug,
                  asset: metadata.tokenSlug,
                  notificationId: item.id,
                  fromAccountProxy: item.proxyId,
                  from: item.address
                });

                await switchReadNotificationStatus(switchStatusParams);
                navigate('/transaction/claim-bridge');
              } else {
                showWarningModal('claimed');
              }
            } catch (error) {
              console.error(error);
            }
          };

          handleClaimPolygonBridge().catch((err) => {
            console.error('Error:', err);
          });
          break;
        }

        case NotificationActionType.CLAIM_AVAIL_BRIDGE_ON_ETHEREUM:

        // eslint-disable-next-line no-fallthrough
        case NotificationActionType.CLAIM_AVAIL_BRIDGE_ON_AVAIL: {
          const metadata = item.metadata as ClaimAvailBridgeNotificationMetadata;

          if (metadata.status === BridgeTransactionStatus.READY_TO_CLAIM) {
            setClaimAvailBridgeStorage({
              chain: metadata.chainSlug,
              asset: metadata.tokenSlug,
              notificationId: item.id,
              fromAccountProxy: item.proxyId,
              from: item.address
            });
            switchReadNotificationStatus(switchStatusParams).then(() => {
              navigate('/transaction/claim-bridge');
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
  }, [accounts, showActiveChainModal, chainStateMap, chainsByAccountType, currentAccountProxy, currentTimestampMs, earningRewards, isAllAccount, isTrigger, navigate, poolInfoMap, setClaimAvailBridgeStorage, setClaimRewardStorage, setWithdrawStorage, showWarningModal, yieldPositions]);

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
        emptyMessage={t('Your notifications will appear here')}
        emptyTitle={t('No notifications yet')}
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
          children: t('Enable notifications')
        }}
        emptyMessage={t('Enable notifications now to not miss anything!')}
        emptyTitle={t('Notifications are disabled')}
        phosphorIcon={BellSimpleSlash}
      />
    );
  }, [loadingNotification, onEnableNotification, t]);

  const handleSwitchClick = useCallback(() => {
    markAllReadNotification(currentProxyId || ALL_ACCOUNT_KEY)
      .catch(console.error);

    setLoading(true);
    fetchInappNotifications({
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
    fetchInappNotifications({
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
          {t('Mark all as read')}
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
                placeholder={t<string>('Search notification')}
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
