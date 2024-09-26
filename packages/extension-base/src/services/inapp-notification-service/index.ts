// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import { CRON_UPDATE_NOTIFICATION_INTERVAL } from '@subwallet/extension-base/constants';
import { CronServiceInterface, ServiceStatus } from '@subwallet/extension-base/services/base/types';
import { DEFAULT_NOTIFICATION_SETTING, NotificationTitleMap } from '@subwallet/extension-base/services/inapp-notification-service/consts';
import { NotificationInfo, NotificationOptions, NotificationSetting, NotificationTimePeriod, NotificationTransactionType } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';
import DatabaseService from '@subwallet/extension-base/services/storage-service/DatabaseService';
import { UnstakingStatus, YieldPoolType } from '@subwallet/extension-base/types';

export class InappNotificationService implements CronServiceInterface {
  status: ServiceStatus;
  private notificationSetting: NotificationSetting = DEFAULT_NOTIFICATION_SETTING;
  private refreshTimeout: NodeJS.Timeout | undefined;
  private readonly dbService: DatabaseService;

  constructor (dbService: DatabaseService) {
    this.status = ServiceStatus.NOT_INITIALIZED;
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

  async getWithdrawNotificationsFromDB () {
    const NOTIFICATION_TRANSACTION_TYPE = NotificationTransactionType.WITHDRAW;
    const allWithdrawNotifications: NotificationInfo[] = [];
    const poolPositions = await this.dbService.getYieldPositions();

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

  updateLastestNotifications () {
    clearTimeout(this.refreshTimeout);

    this.getWithdrawNotificationsFromDB().then(async (notifications) => {
      // todo: add condition to upsert notification or not
      await this.dbService.upsertNotifications(notifications);
    });

    this.refreshTimeout = setTimeout(this.updateLastestNotifications.bind(this), CRON_UPDATE_NOTIFICATION_INTERVAL);
  }

  async start (): Promise<void> {
    if (this.status === ServiceStatus.STARTED) {
      return;
    }

    try {
      this.status = ServiceStatus.STARTING;
      await this.startCron();
      this.status = ServiceStatus.STARTED;
    } catch (e) {

    }
  }

  startCron (): Promise<void> {
    this.updateLastestNotifications();

    return Promise.resolve();
  }

  async stop (): Promise<void> {
    try {
      this.status = ServiceStatus.STOPPING;
      await this.stopCron();
      this.status = ServiceStatus.STOPPED;
    } catch (e) {

    }
  }

  stopCron (): Promise<void> {
    clearTimeout(this.refreshTimeout);

    return Promise.resolve(undefined);
  }
}
