// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import { CRON_UPDATE_NOTIFICATION_INTERVAL } from '@subwallet/extension-base/constants';
import { CronServiceInterface, ServiceStatus } from '@subwallet/extension-base/services/base/types';
import { DEFAULT_NOTIFICATION_SETTING, NotificationTitleMap } from '@subwallet/extension-base/services/inapp-notification-service/consts';
import { NotificationInfo, NotificationOptions, NotificationSetting, NotificationTimePeriod, NotificationTransactionType } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';
import DatabaseService from '@subwallet/extension-base/services/storage-service/DatabaseService';
import { UnstakingStatus, YieldPoolType } from '@subwallet/extension-base/types';
import { GetNotificationParams } from '@subwallet/extension-base/types/notification';
import { BehaviorSubject } from 'rxjs';

export class InappNotificationService implements CronServiceInterface {
  status: ServiceStatus;
  private notificationSetting: NotificationSetting = DEFAULT_NOTIFICATION_SETTING;
  private refreshTimeout: NodeJS.Timeout | undefined;
  private readonly dbService: DatabaseService;
  private unreadNotificationCountSubject = new BehaviorSubject<number>(0);
  private notificationsSubject = new BehaviorSubject<NotificationInfo[]>([]);

  constructor (dbService: DatabaseService) {
    this.status = ServiceStatus.NOT_INITIALIZED;
    this.dbService = dbService;
  }

  async getNotification (id: string) {
    await this.dbService.getNotification(id);
  }

  async updateNotification (notification: NotificationInfo) {
    await this.dbService.updateNotification(notification);
  }

  /* Notification Setting */
  updateNotificationOptions (notificationOptions: NotificationOptions) {
    this.notificationSetting.notificationOptions = notificationOptions;
  }

  updateNotificationTimePeriod (notificationTimePeriod: NotificationTimePeriod) {
    this.notificationSetting.timePeriod = notificationTimePeriod;
  }
  /* Notification Setting */

  async markAllRead (address: string) {
    await this.dbService.markAllRead(address);
  }

  async markRead (notification: NotificationInfo) {
    await this.dbService.markRead(notification);
  }

  async markUnread (notification: NotificationInfo) {
    await this.dbService.markUnread(notification);
  }

  async changeReadStatus (notification: NotificationInfo) {
    await this.dbService.changeReadStatus(notification);
  }

  async getWithdrawNotifications () {
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
      const timestamp = Date.now();

      for (const unstaking of poolPosition.unstakings) {
        if (unstaking.status === UnstakingStatus.CLAIMABLE) {
          allWithdrawNotifications.push({
            id: `${NOTIFICATION_TRANSACTION_TYPE}___${STAKING_TYPE}___${timestamp}`,
            title: NotificationTitleMap[NOTIFICATION_TRANSACTION_TYPE],
            description: this.getWithdrawNotificationDescription(unstaking.claimable, symbol, STAKING_TYPE), // divide decimal
            address: address,
            time: timestamp,
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

    this.getWithdrawNotifications()
      .then(async (notifications) => {
        await this.dbService.upsertNotifications(notifications);
      })
      .catch((e) => {
        console.error(e);
      });

    this.updateUnreadNotificationCountSubject()
      .then().catch((e) => console.error(e));

    this.updateNotificationsSubject()
      .then().catch((e) => console.error(e));

    this.refreshTimeout = setTimeout(this.updateLastestNotifications.bind(this), CRON_UPDATE_NOTIFICATION_INTERVAL);
  }

  private async updateUnreadNotificationCountSubject () {
    const unreadNotificationCount = await this.dbService.getAllUnreadNotifications();

    this.unreadNotificationCountSubject.next(unreadNotificationCount);
  }

  public subscribeUnreadNotificationCount (callback: (data: number) => void) {
    return this.unreadNotificationCountSubject.subscribe({
      next: callback
    });
  }

  public getUnreadNotificationCount () {
    return this.unreadNotificationCountSubject.getValue();
  }

  public async updateNotificationsSubject () {
    const notifications = await this.dbService.getAllNotifications();

    this.notificationsSubject.next(notifications);
  }

  public subscribeNotifications (callback: (data: NotificationInfo[]) => void) {
    return this.notificationsSubject.subscribe({
      next: callback
    });
  }

  public getNotifications () {
    return this.notificationsSubject.getValue();
  }

  public async getNotificationsByParams (params: GetNotificationParams) {
    return await this.dbService.getNotificationsByParams(params);
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

  async startCron (): Promise<void> {
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
