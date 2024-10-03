// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import { CRON_FETCH_NOTIFICATION_INTERVAL, CRON_LISTEN_NOTIFICATION_INTERVAL } from '@subwallet/extension-base/constants';
import { CronServiceInterface, ServiceStatus } from '@subwallet/extension-base/services/base/types';
import { ChainService } from '@subwallet/extension-base/services/chain-service';
import { NotificationTitleMap } from '@subwallet/extension-base/services/inapp-notification-service/consts';
import { NotificationActionType, NotificationInfo } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';
import { getWithdrawNotificationDescription } from '@subwallet/extension-base/services/inapp-notification-service/utils';
import DatabaseService from '@subwallet/extension-base/services/storage-service/DatabaseService';
import { UnstakingStatus } from '@subwallet/extension-base/types';
import { GetNotificationCountResult, GetNotificationParams } from '@subwallet/extension-base/types/notification';
import { formatNumber } from '@subwallet/extension-base/utils';
import { BehaviorSubject } from 'rxjs';

export class InappNotificationService implements CronServiceInterface {
  status: ServiceStatus;
  private refreshGetNotificationTimeout: NodeJS.Timeout | undefined;
  private refreshListenNotificationTimeout: NodeJS.Timeout | undefined;
  private readonly dbService: DatabaseService;
  private readonly chainService: ChainService;
  private unreadNotificationCountSubject = new BehaviorSubject<GetNotificationCountResult>({ count: 0 });

  constructor (dbService: DatabaseService, chainService: ChainService) {
    this.status = ServiceStatus.NOT_INITIALIZED;
    this.dbService = dbService;
    this.chainService = chainService;
  }

  async getNotification (id: string) {
    await this.dbService.getNotification(id);
  }

  async updateNotification (notification: NotificationInfo) {
    await this.dbService.updateNotification(notification);
  }

  async markAllRead (address: string) {
    await this.dbService.markAllRead(address);
  }

  async changeReadStatus (notification: NotificationInfo) {
    await this.dbService.changeReadStatus(notification);
  }

  // todo:
  // createSendNotifications
  // createReceiveNotifications
  // createClaimNotifications

  async createWithdrawNotifications () {
    const notificationActionType = NotificationActionType.WITHDRAW;
    const allWithdrawNotifications: NotificationInfo[] = [];
    const poolPositions = await this.dbService.getYieldPositions();

    for (const poolPosition of poolPositions) {
      if (!poolPosition.unstakings.length) {
        continue;
      }

      const stakingType = poolPosition.type;
      const stakingSlug = poolPosition.slug;
      const symbol = poolPosition.slug.split('___')[0];
      const timestamp = Date.now();

      for (const unstaking of poolPosition.unstakings) {
        const isClaimable = unstaking.status === UnstakingStatus.CLAIMABLE;
        const claimableAmount = unstaking.claimable;
        const decimal = this.chainService.getAssetBySlug(poolPosition.balanceToken).decimals || 0;
        const amount = formatNumber(claimableAmount, decimal);

        if (isClaimable) {
          allWithdrawNotifications.push({
            id: `${notificationActionType}___${stakingSlug}___${timestamp}`,
            title: NotificationTitleMap[notificationActionType],
            description: getWithdrawNotificationDescription(amount, symbol, stakingType),
            address: poolPosition.address,
            time: timestamp,
            extrinsicType: ExtrinsicType.STAKING_WITHDRAW,
            isRead: false,
            actionType: notificationActionType,
            metadata: {
              stakingType,
              stakingSlug
            }
          });
        }
      }
    }

    return allWithdrawNotifications;
  }

  private async updateUnreadNotificationCountSubject () {
    const unreadNotificationCount = await this.dbService.getAllUnreadNotifications();

    this.unreadNotificationCountSubject.next({ count: unreadNotificationCount });
  }

  public subscribeUnreadNotificationCount (callback: (data: GetNotificationCountResult) => void) {
    return this.unreadNotificationCountSubject.subscribe({
      next: callback
    });
  }

  public getUnreadNotificationCount () {
    return this.unreadNotificationCountSubject.getValue();
  }

  public async getNotificationsByParams (params: GetNotificationParams) {
    return await this.dbService.getNotificationsByParams(params);
  }

  createLastestNotifications () {
    clearTimeout(this.refreshGetNotificationTimeout);

    this.createWithdrawNotifications()
      .then(async (notifications) => {
        await this.dbService.upsertNotifications(notifications);
      })
      .catch((e) => {
        console.error(e);
      });

    this.refreshGetNotificationTimeout = setTimeout(this.createLastestNotifications.bind(this), CRON_FETCH_NOTIFICATION_INTERVAL);
  }

  listenLastestNotifications () {
    clearTimeout(this.refreshListenNotificationTimeout);

    this.updateUnreadNotificationCountSubject()
      .then().catch((e) => console.error(e));

    this.refreshListenNotificationTimeout = setTimeout(this.listenLastestNotifications.bind(this), CRON_LISTEN_NOTIFICATION_INTERVAL);
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
    this.listenLastestNotifications();
    this.createLastestNotifications();

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
    clearTimeout(this.refreshGetNotificationTimeout);
    clearTimeout(this.refreshListenNotificationTimeout);

    return Promise.resolve(undefined);
  }
}
