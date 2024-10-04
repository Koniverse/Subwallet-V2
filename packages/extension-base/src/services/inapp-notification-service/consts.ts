// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NotificationActionType } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';
import { getClaimDescription, getReceiveDescription, getSendDescription, getWithdrawDescription } from '@subwallet/extension-base/services/inapp-notification-service/utils';

export const NotificationTitleMap = {
  [NotificationActionType.WITHDRAW]: 'Token Withdrawal',
  [NotificationActionType.CLAIM]: 'Token Claimable',
  [NotificationActionType.SEND]: 'Token Send',
  [NotificationActionType.RECEIVE]: 'Token Receive'
};

export const NotificationDescriptionMap = {
  [NotificationActionType.WITHDRAW]: getWithdrawDescription,
  [NotificationActionType.CLAIM]: getClaimDescription,
  [NotificationActionType.SEND]: getSendDescription,
  [NotificationActionType.RECEIVE]: getReceiveDescription
};
