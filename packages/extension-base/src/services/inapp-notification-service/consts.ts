// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NotificationTransactionType } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';

export const NotificationTitleMap = {
  [NotificationTransactionType.WITHDRAW]: 'Token Withdrawal',
  [NotificationTransactionType.CLAIM]: 'Token Claimable',
  [NotificationTransactionType.SEND]: 'Token Send',
  [NotificationTransactionType.RECEIVE]: 'Token Receive'
};
