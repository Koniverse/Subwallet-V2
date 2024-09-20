// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import { BehaviorSubject } from 'rxjs';

interface NotificationInfo {
  id: string,
  title: string,
  description: string,
  time: string,
  extrinsicType: string,
  isRead: boolean,
  actionType: NotificationTransactionType
}

enum NotificationTransactionType {
  SEND = 'send',
  RECEIVE = 'receive',
  WITHDRAW = 'withdraw',
  CLAIM = 'claim'
}

const DEMO_WITHDRAWABLE_ITEM = {
  id: '1',
  title: 'abcxyz',
  description: 'abcxyz',
  time: Date.now(),
  extrinsicType: ExtrinsicType.STAKING_WITHDRAW,
  isRead: false,
  actionType: NotificationTransactionType.WITHDRAW
};

export class InappNotificationService {
  private notificationSubject = new BehaviorSubject<NotificationInfo[]>([]);

  getNotifications () {
    return this.notificationSubject;
  }

  addNotifications (notifications: NotificationInfo[]) {
    this.notificationSubject.next(notifications);
  }
}
