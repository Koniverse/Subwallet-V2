// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import { NotificationActionType, WithdrawClaimNotificationMetadata } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';
import { CLAIM_REWARD_TRANSACTION, DEFAULT_CLAIM_REWARD_PARAMS, DEFAULT_UN_STAKE_PARAMS, DEFAULT_WITHDRAW_PARAMS, NOTIFICATION_DETAIL_MODAL, WITHDRAW_TRANSACTION } from '@subwallet/extension-koni-ui/constants';
import { useLocalStorage } from '@subwallet/extension-koni-ui/hooks/common/useLocalStorage';
import { changeReadNotificationStatus } from '@subwallet/extension-koni-ui/messaging/transaction/notification';
import { NotificationInfoItem } from '@subwallet/extension-koni-ui/Popup/Settings/Notifications/Notification';
import { Theme, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { BackgroundIcon, ModalContext, SwModal } from '@subwallet/react-ui';
import { SwIconProps } from '@subwallet/react-ui/es/icon';
import { Checks, DownloadSimple, Eye, Gift, X } from 'phosphor-react';
import React, { useCallback, useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import styled, { useTheme } from 'styled-components';

type Props = ThemeProps & {
  onCancel?: () => void;
  notificationItem: NotificationInfoItem;
  isTrigger: boolean;
  setTrigger: (value: boolean) => void;
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
  const { className, isTrigger, notificationItem, onCancel, setTrigger } = props;
  const [readNotification, setReadNotification] = useState<boolean>(notificationItem.isRead);
  const { t } = useTranslation();
  const { token } = useTheme() as Theme;
  const { inactiveModal } = useContext(ModalContext);

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

  const onClickAction = useCallback(() => {
    switch (notificationItem.actionType) {
      case NotificationActionType.WITHDRAW: {
        const metadata = notificationItem.metadata as WithdrawClaimNotificationMetadata;

        setWithdrawStorage({
          ...DEFAULT_UN_STAKE_PARAMS,
          slug: metadata.stakingSlug,
          chain: metadata.stakingSlug.split('___')[2],
          from: notificationItem.address
        });
        navigate('/transaction/withdraw');

        break;
      }

      case NotificationActionType.CLAIM: {
        const metadata = notificationItem.metadata as WithdrawClaimNotificationMetadata;

        setClaimRewardStorage({
          ...DEFAULT_CLAIM_REWARD_PARAMS,
          slug: metadata.stakingSlug,
          chain: metadata.stakingSlug.split('___')[2],
          from: notificationItem.address
        });
        navigate('/transaction/claim-reward');

        break;
      }

      case NotificationActionType.CLAIM_AVAIL_BRIDGE_ON_AVAIL: {
        // todo: update this
        break;
      }

      case NotificationActionType.CLAIM_AVAIL_BRIDGE_ON_ETHEREUM: {
        // todo: update this
        break;
      }
    }
  }, [navigate, notificationItem.actionType, notificationItem.address, notificationItem.metadata, setClaimRewardStorage, setWithdrawStorage]);

  const handleNotificationInfo = useCallback(() => {
    const { icon, title } = getNotificationAction(notificationItem.extrinsicType);
    const sampleData: ActionInfo = {
      title,
      extrinsicType: ExtrinsicType.TRANSFER_TOKEN, // todo: recheck this
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
              backgroundColor={handleNotificationInfo().backgroundColor}
              phosphorIcon={handleNotificationInfo().leftIcon}
              size='sm'
              weight='fill'
            />
          </div>
          <div className={'__right-part'}>{handleNotificationInfo().title}</div>
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
