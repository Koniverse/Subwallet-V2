// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';

export interface NotificationInfo {
  id: string,
  title: string,
  description: string,
  address: string,
  time: number,
  extrinsicType: ExtrinsicType,
  isRead: boolean,
  actionType: NotificationTransactionType
}

export interface NotificationSetting {
  timePeriod: NotificationTimePeriod,
  notificationOptions: NotificationOptions
}

export interface NotificationOptions {
  balance: boolean,
  action: boolean,
  announcement: boolean
}

export enum NotificationTimePeriod {
  TODAY = 'TODAY',
  THIS_WEEK = 'THIS_WEEK',
  THIS_MONTH = 'THIS_MONTH'
}

export enum NotificationTransactionType {
  SEND = 'SEND',
  RECEIVE = 'RECEIVE',
  WITHDRAW = 'WITHDRAW',
  CLAIM = 'CLAIM'
}

export enum NotificationTab {
  ALL = 'ALL',
  UNREAD = 'UNREAD',
  READ = 'READ'
}

export interface NotificationSetup {
  isEnabled: boolean,
  notificationSetup: {
    isHideSend: boolean,
    isHideReceive: boolean,
    isHideWithdraw: boolean,
    isHideMarketing: boolean,
    isHideAnnouncement: boolean
  }
}
