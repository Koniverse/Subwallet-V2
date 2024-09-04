// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NOTIFICATION_DETAIL_MODAL } from '@subwallet/extension-koni-ui/constants';
import { NotificationInfo } from '@subwallet/extension-koni-ui/Popup/Settings/Notifications/Notification';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import { ModalContext, SwModal } from '@subwallet/react-ui';
import React, { useCallback, useContext } from 'react';
import styled from 'styled-components';

type Props = ThemeProps & {
  onCancel?: () => void;
  notificationItem: NotificationInfo;
};

function Component (props: Props): React.ReactElement<Props> {
  const { className, notificationItem, onCancel } = props;

  const { inactiveModal } = useContext(ModalContext);

  const _onCancel = useCallback(() => {
    inactiveModal(NOTIFICATION_DETAIL_MODAL);

    onCancel && onCancel();
  }, [inactiveModal, onCancel]);

  const handleActionNotification = useCallback(() => {

  }, []);

  return (
    <SwModal
      className={className}
      id={NOTIFICATION_DETAIL_MODAL}
      onCancel={_onCancel}
      title={notificationItem.title}
    >
    </SwModal>
  );
}

const NotificationDetailModal = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return ({
  });
});

export default NotificationDetailModal;
