// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import { CronServiceInterface } from '@subwallet/extension-base/services/base/types';
import { DEFAULT_NOTIFICATION_SETTING, NotificationTitleMap } from '@subwallet/extension-base/services/inapp-notification-service/consts';
import { NotificationInfo, NotificationOptions, NotificationSetting, NotificationTimePeriod, NotificationTransactionType } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';
import DatabaseService from '@subwallet/extension-base/services/storage-service/DatabaseService';
import { UnstakingStatus, YieldPoolType, YieldPositionInfo } from '@subwallet/extension-base/types';

export class InappNotificationService implements CronServiceInterface {
  private notificationSetting: NotificationSetting = DEFAULT_NOTIFICATION_SETTING;
  readonly dbService: DatabaseService;

  constructor (dbService: DatabaseService) {
    this.dbService = dbService;
  }

  getNotification (id: string) {
    this.dbService.getNotification(id);
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

  async getWithdrawNotificationsFromDB (poolPositions: YieldPositionInfo[]) {
    const NOTIFICATION_TRANSACTION_TYPE = NotificationTransactionType.WITHDRAW;
    const allWithdrawNotifications: NotificationInfo[] = [];

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
            id: `${NOTIFICATION_TRANSACTION_TYPE}___${STAKING_TYPE}___${Date.now()}`,
            title: NotificationTitleMap[NOTIFICATION_TRANSACTION_TYPE],
            description: this.getWithdrawNotificationDescription(unstaking.claimable, symbol, STAKING_TYPE), // divide decimal
            address: address,
            time: Date.now(),
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
