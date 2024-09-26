// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import { DEFAULT_NOTIFICATION_SETTING, DEMO_WITHDRAWABLE_ITEM, NotificationTitleMap } from '@subwallet/extension-base/services/inapp-notification-service/consts';
import { NotificationInfo, NotificationOptions, NotificationSetting, NotificationTimePeriod, NotificationTransactionType } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';
import DatabaseService from '@subwallet/extension-base/services/storage-service/DatabaseService';
import { UnstakingStatus, YieldPoolType } from '@subwallet/extension-base/types';

export class InappNotificationService {
  private notificationList: NotificationInfo[] = [];
  private notificationSetting: NotificationSetting = DEFAULT_NOTIFICATION_SETTING;
  readonly dbService: DatabaseService;

  constructor (dbService: DatabaseService) {
    this.dbService = dbService;
  }

  async init () {
    this.addNotifications([DEMO_WITHDRAWABLE_ITEM]);
    const notifications = this.getNotifications();

    console.log('notifications', notifications);

    const position = await this.getPoolPositionByAddressesFromDB(['5CFh4qpiB5PxsQvPEs6dWAhzgAVLHZa8tZKxeE9XsHBg4n9t']);

    console.log('position', position);

    const pst = await this.getWithdrawNotificationsFromDB(['5CFh4qpiB5PxsQvPEs6dWAhzgAVLHZa8tZKxeE9XsHBg4n9t']);

    console.log('pst', pst);
  }

  getNotifications () {
    return this.notificationList;
  }

  addNotifications (notifications: NotificationInfo[]) {
    this.notificationList.push(...notifications);
  }

  updateNotificationOptions (notificationOptions: NotificationOptions) {
    this.notificationSetting.notificationOptions = notificationOptions;
  }

  updateNotificationTimePeriod (notificationTimePeriod: NotificationTimePeriod) {
    this.notificationSetting.timePeriod = notificationTimePeriod;
  }

  getPoolPositionByAddressesFromDB (addresses: string[]) {
    return this.dbService.getYieldPositionByAddress(addresses);
  }

  async getWithdrawNotificationsFromDB (addresses: string[]) {
    const NOTIFICATION_TRANSACTION_TYPE = NotificationTransactionType.WITHDRAW;
    const allWithdrawNotifications: NotificationInfo[] = [];
    const poolPositions = await this.getPoolPositionByAddressesFromDB(addresses);

    for (const poolPosition of poolPositions) {
      if (!poolPosition.unstakings.length) {
        continue;
      }

      const STAKING_TYPE = poolPosition.type;
      const symbol = poolPosition.slug.split('___')[0];
      const address = poolPosition.address;

      for (const unstaking of poolPosition.unstakings) {
        if (unstaking.status === UnstakingStatus.CLAIMABLE) {
          allWithdrawNotifications.push({
            id: `${NOTIFICATION_TRANSACTION_TYPE}___${STAKING_TYPE}___${unstaking.targetTimestampMs}`,
            title: NotificationTitleMap[NOTIFICATION_TRANSACTION_TYPE],
            description: this.getWithdrawNotificationDescription(unstaking.claimable, symbol, STAKING_TYPE), // divide decimal
            address: address,
            time: unstaking.targetTimestampMs || Date.now(),
            extrinsicType: ExtrinsicType.STAKING_WITHDRAW,
            isRead: false,
            actionType: NotificationTransactionType.WITHDRAW
          });
        }
      }
    }

    return allWithdrawNotifications;
  }

  getWithdrawNotificationDescription (amount: string, symbol: string, stakingType: YieldPoolType) {
    return `You has ${amount} ${symbol} ${stakingType} to withdraw`;
  }
}
