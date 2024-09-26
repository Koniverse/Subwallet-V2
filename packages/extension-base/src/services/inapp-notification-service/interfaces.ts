// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

export interface NotificationInfo {
  id: string,
  title: string,
  description: string,
  address: string,
  time: number,
  extrinsicType: string,
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
  ALL = 'ALL',
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
