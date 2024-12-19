// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import { NOTIFICATION_DETAIL_MODAL } from '@subwallet/extension-koni-ui/constants';
import { switchReadNotificationStatus } from '@subwallet/extension-koni-ui/messaging/transaction/notification';
import { NotificationInfoItem } from '@subwallet/extension-koni-ui/Popup/Settings/Notifications/Notification';
import { Theme, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { BackgroundIcon, ModalContext, SwModal } from '@subwallet/react-ui';
import { SwIconProps } from '@subwallet/react-ui/es/icon';
import { Checks, Coins, DownloadSimple, Eye, Gift, X } from 'phosphor-react';
import React, { useCallback, useContext, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled, { useTheme } from 'styled-components';

type Props = ThemeProps & {
  onCancel?: () => void;
  notificationItem: NotificationInfoItem;
  isTrigger: boolean;
  setTrigger: (value: boolean) => void;
  onClickAction: () => void;
};

export interface ActionInfo {
  title: string;
  extrinsicType: ExtrinsicType;
  backgroundColor: string;
  leftIcon?: SwIconProps['phosphorIcon'];
  disabled?: boolean;
  isRead?: boolean;
}

export interface BriefActionInfo {
  icon: ActionInfo['leftIcon'];
  title: ActionInfo['title'];
  backgroundColor?: ActionInfo['backgroundColor'];
}

function Component (props: Props): React.ReactElement<Props> {
  const { className, isTrigger, notificationItem, onCancel, onClickAction, setTrigger } = props;
  const [readNotification, setReadNotification] = useState<boolean>(notificationItem.isRead);
  const { t } = useTranslation();
  const { token } = useTheme() as Theme;
  const { inactiveModal } = useContext(ModalContext);

  const _onCancel = useCallback(() => {
    inactiveModal(NOTIFICATION_DETAIL_MODAL);

    onCancel && onCancel();
  }, [inactiveModal, onCancel]);

  const getNotificationAction = (type: ExtrinsicType): BriefActionInfo => {
    switch (type) {
      case ExtrinsicType.STAKING_WITHDRAW:
        return {
          title: 'Withdraw tokens',
          icon: DownloadSimple
        };
      case ExtrinsicType.STAKING_CLAIM_REWARD:
        return {
          title: 'Claim tokens',
          icon: Gift
        };
      case ExtrinsicType.CLAIM_BRIDGE:
        return {
          title: 'Claim tokens',
          icon: Coins
        };
      default:
        return {
          title: 'View details',
          icon: Eye
        };
    }
  };

  const handleNotificationInfo = useMemo(() => {
    const { icon, title } = getNotificationAction(notificationItem.extrinsicType);
    const sampleData: ActionInfo = {
      title,
      extrinsicType: ExtrinsicType.TRANSFER_TOKEN, // todo: recheck to remove this
      backgroundColor: token.geekblue,
      leftIcon: icon
    };

    return sampleData;
  }, [notificationItem.extrinsicType, token.geekblue]);

  const onClickReadButton = useCallback(() => {
    setReadNotification(!readNotification);
    switchReadNotificationStatus({
      id: notificationItem.id,
      isRead: notificationItem.isRead
    })
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
              backgroundColor={handleNotificationInfo.backgroundColor}
              phosphorIcon={handleNotificationInfo.leftIcon}
              size='sm'
              weight='fill'
            />
          </div>
          <div className={'__right-part'}>{handleNotificationInfo.title}</div>
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
          <div className={'__right-part'}>{readNotification ? t('Mark as unread') : t('Mark as read')}</div>
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
