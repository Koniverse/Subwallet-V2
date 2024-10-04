// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import { YieldPoolType } from '@subwallet/extension-base/types';

export interface NotificationInfo {
  id: string,
  title: string,
  description: string,
  address: string,
  time: number,
  extrinsicType: ExtrinsicType,
  isRead: boolean,
  actionType: NotificationActionType,
  metadata: ActionTypeToMetadataMap[NotificationActionType]
}

export interface ActionTypeToMetadataMap {
  [NotificationActionType.SEND]: SendReceiveNotificationMetadata,
  [NotificationActionType.RECEIVE]: SendReceiveNotificationMetadata
  [NotificationActionType.WITHDRAW]: WithdrawClaimNotificationMetadata,
  [NotificationActionType.CLAIM]: WithdrawClaimNotificationMetadata,
}

export interface SendReceiveNotificationMetadata {
  chain: string,
  from: string,
  to: string,
  extrinsicHash: string,
  amount: bigint,
  tokenSlug: string
}

export interface WithdrawClaimNotificationMetadata {
  stakingType: YieldPoolType,
  stakingSlug: string
}

export enum NotificationTimePeriod {
  TODAY = 'TODAY',
  THIS_WEEK = 'THIS_WEEK',
  THIS_MONTH = 'THIS_MONTH'
}

export enum NotificationActionType {
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
