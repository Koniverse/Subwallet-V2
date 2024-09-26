// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ExtrinsicType} from "@subwallet/extension-base/background/KoniTypes";
import {
  NotificationTransactionType,
  NotificationTimePeriod
} from "@subwallet/extension-base/services/inapp-notification-service/interfaces";

export const DEMO_WITHDRAWABLE_ITEM = {
  id: '1',
  title: 'Token Withdrawal',
  description: 'You has 0.05 TVARA to withdraw',
  time: Date.now(),
  address: '5CFh4qpiB5PxsQvPEs6dWAhzgAVLHZa8tZKxeE9XsHBg4n9t',
  extrinsicType: ExtrinsicType.STAKING_WITHDRAW,
  isRead: false,
  actionType: NotificationTransactionType.WITHDRAW
};

export const DEFAULT_NOTIFICATION_SETTING = {
  timePeriod: NotificationTimePeriod.ALL,
  notificationOptions: {
    balance: true,
    action: true,
    announcement: true,
  }
}

export const NotificationTitleMap = {
  [NotificationTransactionType.WITHDRAW]: 'Token Withdrawal',
  [NotificationTransactionType.CLAIM]: 'Token Claimable',
  [NotificationTransactionType.SEND]: 'Token Send',
  [NotificationTransactionType.RECEIVE]: 'Token Receive'
}
