// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ExtrinsicType, NotificationType } from '@subwallet/extension-base/background/KoniTypes';
import { NotificationActionType, WithdrawClaimNotificationMetadata } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';
import { UnstakingStatus } from '@subwallet/extension-base/types';
import { BN_ZERO, CLAIM_REWARD_TRANSACTION, DEFAULT_CLAIM_REWARD_PARAMS, DEFAULT_UN_STAKE_PARAMS, DEFAULT_WITHDRAW_PARAMS, NOTIFICATION_DETAIL_MODAL, WITHDRAW_TRANSACTION } from '@subwallet/extension-koni-ui/constants';
import { useYieldPositionDetail, useYieldRewardTotal } from '@subwallet/extension-koni-ui/hooks';
import { useLocalStorage } from '@subwallet/extension-koni-ui/hooks/common/useLocalStorage';
import { changeReadNotificationStatus } from '@subwallet/extension-koni-ui/messaging/transaction/notification';
import { NotificationInfoItem } from '@subwallet/extension-koni-ui/Popup/Settings/Notifications/Notification';
import { AlertDialogProps, Theme, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { BackgroundIcon, ModalContext, SwModal } from '@subwallet/react-ui';
import { SwIconProps } from '@subwallet/react-ui/es/icon';
import BigN from 'bignumber.js';
import { CheckCircle, Checks, DownloadSimple, Eye, Gift, X } from 'phosphor-react';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import styled, { useTheme } from 'styled-components';

type Props = ThemeProps & {
  onCancel?: () => void;
  notificationItem: NotificationInfoItem;
  isTrigger: boolean;
  setTrigger: (value: boolean) => void;
  openAlert: (alertProps: AlertDialogProps) => void;
  closeAlert: VoidFunction;
};

export interface ActionInfo {
  title: string;
  extrinsicType: ExtrinsicType;
  backgroundColor: string;
  leftIcon?: SwIconProps['phosphorIcon'];
  disabled?: boolean;
  isRead?: boolean;
}

function Component (props: Props): React.ReactElement<Props> {
  const { className, closeAlert, isTrigger, notificationItem, onCancel, openAlert, setTrigger } = props;
  const [readNotification, setReadNotification] = useState<boolean>(notificationItem.isRead);
  const { t } = useTranslation();
  const { token } = useTheme() as Theme;
  const { inactiveModal } = useContext(ModalContext);
  const earningData = useYieldPositionDetail((notificationItem.metadata as WithdrawClaimNotificationMetadata).stakingSlug);
  const unclaimedReward = useYieldRewardTotal((notificationItem.metadata as WithdrawClaimNotificationMetadata).stakingSlug);
  const [currentTimestampMs, setCurrentTimestampMs] = useState(Date.now());

  const totalWidrawable = useMemo(() => {
    if (earningData && earningData.compound && earningData.compound.unstakings) {
      let result = BN_ZERO;

      earningData.compound.unstakings.forEach((value) => {
        const canClaim = value.targetTimestampMs
          ? value.targetTimestampMs <= currentTimestampMs
          : value.status === UnstakingStatus.CLAIMABLE;

        if (canClaim) {
          result = result.plus(value.claimable);
        }
      });

      return result;
    } else {
      return '0';
    }
  }, [currentTimestampMs, earningData]);

  const _onCancel = useCallback(() => {
    inactiveModal(NOTIFICATION_DETAIL_MODAL);

    onCancel && onCancel();
  }, [inactiveModal, onCancel]);

  const getNotificationAction = (type: ExtrinsicType) => {
    switch (type) {
      case ExtrinsicType.STAKING_WITHDRAW:
        return {
          title: 'Withdraw',
          icon: DownloadSimple
        };
      case ExtrinsicType.STAKING_CLAIM_REWARD:
        return {
          title: 'Claim',
          icon: Gift
        };
      default:
        return {
          title: 'View details',
          icon: Eye
        };
    }
  };

  const [, setClaimRewardStorage] = useLocalStorage(CLAIM_REWARD_TRANSACTION, DEFAULT_CLAIM_REWARD_PARAMS);
  const [, setWithdrawStorage] = useLocalStorage(WITHDRAW_TRANSACTION, DEFAULT_WITHDRAW_PARAMS);
  const navigate = useNavigate();

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

  const onClickAction = useCallback(() => {
    switch (notificationItem.actionType) {
      case NotificationActionType.WITHDRAW: {
        if (totalWidrawable && BigN(totalWidrawable).gt(BN_ZERO)) {
          const metadata = notificationItem.metadata as WithdrawClaimNotificationMetadata;

          setWithdrawStorage({
            ...DEFAULT_UN_STAKE_PARAMS,
            slug: metadata.stakingSlug,
            chain: metadata.stakingSlug.split('___')[2],
            from: notificationItem.address
          });
          changeReadNotificationStatus(notificationItem).then(() => {
            navigate('/transaction/withdraw');
          }).catch(console.error);
        } else {
          showWarningModal('withdrawn');
        }

        break;
      }

      case NotificationActionType.CLAIM: {
        if (unclaimedReward && BigN(unclaimedReward).gt(BN_ZERO)) {
          const metadata = notificationItem.metadata as WithdrawClaimNotificationMetadata;

          setClaimRewardStorage({
            ...DEFAULT_CLAIM_REWARD_PARAMS,
            slug: metadata.stakingSlug,
            chain: metadata.stakingSlug.split('___')[2],
            from: notificationItem.address
          });
          changeReadNotificationStatus(notificationItem).then(() => {
            navigate('/transaction/claim-reward');
          }).catch(console.error);
        } else {
          showWarningModal('claimed');
        }

        break;
      }
    }
  }, [navigate, notificationItem, setClaimRewardStorage, setWithdrawStorage, showWarningModal, totalWidrawable, unclaimedReward]);

  const handleActionNotification = useCallback(() => {
    const { icon, title } = getNotificationAction(notificationItem.extrinsicType);
    const sampleData: ActionInfo = {
      title,
      extrinsicType: ExtrinsicType.TRANSFER_TOKEN,
      backgroundColor: token.geekblue,
      leftIcon: icon
    };

    return sampleData;
  }, [notificationItem.extrinsicType, token.geekblue]);

  const onClickReadButton = useCallback(() => {
    setReadNotification(!readNotification);
    changeReadNotificationStatus(notificationItem)
      .catch(console.error)
      .finally(() => {
        _onCancel();
        setTrigger(!isTrigger);
      });
  }, [_onCancel, isTrigger, notificationItem, readNotification, setTrigger]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimestampMs(Date.now());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <SwModal
      className={className}
      id={NOTIFICATION_DETAIL_MODAL}
      onCancel={_onCancel}
      title={t('Actions')}
    >
      <div className={'__button-container'}>
        <div
          className={'__mark-action-details'}
          onClick={onClickAction}
        >
          <div className={'__left-part'}>
            <BackgroundIcon
              backgroundColor={handleActionNotification().backgroundColor}
              phosphorIcon={handleActionNotification().leftIcon}
              size='sm'
              weight='fill'
            />
          </div>
          <div className={'__right-part'}>{handleActionNotification().title}</div>
        </div>
        <div
          className={'__mark-read-button'}
          onClick={onClickReadButton}
        >
          <div className={'__left-part'}>
            <BackgroundIcon
              backgroundColor={readNotification ? token['gray-3'] : token['green-6']}
              phosphorIcon={readNotification ? Checks : X}
              size='sm'
              weight='fill'
            />
          </div>
          <div className={'__right-part'}>{readNotification ? t('Mark un-read') : t('Mark read')}</div>
        </div>
      </div>

    </SwModal>
  );
}

const NotificationDetailModal = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return ({
    '.__mark-read-button, .__mark-action-details': {
      display: 'flex',
      gap: 12,
      paddingTop: 14,
      paddingBottom: 14,
      paddingRight: 12,
      paddingLeft: 12,
      borderRadius: 8,
      backgroundColor: token.colorBgSecondary,
      cursor: 'pointer'
    },
    '.__button-container': {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  });
});

export default NotificationDetailModal;
