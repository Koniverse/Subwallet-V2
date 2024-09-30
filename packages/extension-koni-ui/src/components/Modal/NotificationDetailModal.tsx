// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import { NOTIFICATION_DETAIL_MODAL } from '@subwallet/extension-koni-ui/constants';
import { changeReadNotificationStatus } from '@subwallet/extension-koni-ui/messaging/transaction/notification';
import { NotificationInfoItem } from '@subwallet/extension-koni-ui/Popup/Settings/Notifications/Notification';
import { Theme, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { BackgroundIcon, ModalContext, SwModal } from '@subwallet/react-ui';
import { SwIconProps } from '@subwallet/react-ui/es/icon';
import { Checks, DownloadSimple, Eye, Gift, X } from 'phosphor-react';
import React, { useCallback, useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled, { useTheme } from 'styled-components';

type Props = ThemeProps & {
  onCancel?: () => void;
  notificationItem: NotificationInfoItem;
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
  const { className, notificationItem, onCancel } = props;
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

  const onClickReadButton = useCallback(async () => {
    setReadNotification(!readNotification);
    await changeReadNotificationStatus(notificationItem);
  }, [notificationItem, readNotification]);

  return (
    <SwModal
      className={className}
      id={NOTIFICATION_DETAIL_MODAL}
      onCancel={_onCancel}
      title={t('Actions')}
    >
      <div className={'__button-container'}>
        <div className={'__mark-action-details'}>
          <div
            className={'__left-part'}
            onClick={handleActionNotification}
          >
            <BackgroundIcon
              backgroundColor={handleActionNotification().backgroundColor}
              phosphorIcon={handleActionNotification().leftIcon}
              size='sm'
              weight='fill'
            />
          </div>
          <div className={'__right-part'}>{handleActionNotification().title}</div>
        </div>
        <div className={'__mark-read-button'}>
          <div
            className={'__left-part'}
            onClick={onClickReadButton}
          >
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
      backgroundColor: token.colorBgSecondary
    },
    '.__button-container': {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  });
});

export default NotificationDetailModal;
