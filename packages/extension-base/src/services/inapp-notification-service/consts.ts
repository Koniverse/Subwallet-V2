// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NotificationActionType } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';
import { getClaimDescription, getReceiveDescription, getSendDescription, getWithdrawDescription } from '@subwallet/extension-base/services/inapp-notification-service/utils';

export const NotificationTitleMap = {
  [NotificationActionType.WITHDRAW]: '[{{accountName}}] WITHDRAW {{tokenSymbol}}',
  [NotificationActionType.CLAIM]: '[{{accountName}}] CLAIM {{tokenSymbol}}',
  [NotificationActionType.SEND]: '[{{accountName}}] SEND {{tokenSymbol}}',
  [NotificationActionType.RECEIVE]: '[{{accountName}}] RECEIVE {{tokenSymbol}}'
};

export const NotificationDescriptionMap = {
  [NotificationActionType.WITHDRAW]: getWithdrawDescription,
  [NotificationActionType.CLAIM]: getClaimDescription,
  [NotificationActionType.SEND]: getSendDescription,
  [NotificationActionType.RECEIVE]: getReceiveDescription
};

export const ONE_DAY_MILLISECOND = 86400000;
