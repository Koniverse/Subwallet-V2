// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { CronServiceInterface, ServiceStatus } from '@subwallet/extension-base/services/base/types';
import { ONE_DAY_MILLISECOND } from '@subwallet/extension-base/services/inapp-notification-service/consts';
import { _BaseNotificationInfo, _NotificationInfo, NotificationActionType, NotificationTab, WithdrawClaimNotificationMetadata } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';
import { KeyringService } from '@subwallet/extension-base/services/keyring-service';
import DatabaseService from '@subwallet/extension-base/services/storage-service/DatabaseService';
import { GetNotificationParams, RequestSwitchStatusParams } from '@subwallet/extension-base/types/notification';

export class InappNotificationService implements CronServiceInterface {
  status: ServiceStatus;
  private readonly dbService: DatabaseService;
  private readonly keyringService: KeyringService;

  constructor (dbService: DatabaseService, keyringService: KeyringService) {
    this.status = ServiceStatus.NOT_INITIALIZED;
    this.dbService = dbService;
    this.keyringService = keyringService;
  }

  async markAllRead (proxyId: string) {
    await this.dbService.markAllRead(proxyId);
  }

  async switchReadStatus (params: RequestSwitchStatusParams) {
    await this.dbService.switchReadStatus(params);
  }

  public subscribeUnreadNotificationsCountMap (callback: (data: Record<string, number>) => void) {
    return this.dbService.subscribeUnreadNotificationsCountMap().subscribe(
      {
        next: callback
      }
    );
  }

  public async getUnreadNotificationsCountMap () {
    return await this.dbService.getUnreadNotificationsCountMap();
  }

  public async getNotificationsByParams (params: GetNotificationParams) {
    return this.dbService.getNotificationsByParams(params);
  }

  cleanUpOldNotifications (overdueTime = ONE_DAY_MILLISECOND * 60) {
    return this.dbService.cleanUpOldNotifications(overdueTime);
  }

  passValidateNotification (candidateNotification: _BaseNotificationInfo, notificationFromDB: _NotificationInfo[]) {
    if ([NotificationActionType.WITHDRAW, NotificationActionType.CLAIM].includes(candidateNotification.actionType)) {
      const { actionType, address, metadata, time } = candidateNotification;
      const candidateMetadata = metadata as WithdrawClaimNotificationMetadata;

      for (const notification of notificationFromDB) {
        const comparedMetadata = notification.metadata as WithdrawClaimNotificationMetadata;

        if (notification.address !== address) {
          continue;
        }

        if (notification.actionType !== actionType) {
          continue;
        }

        if (time - notification.time >= ONE_DAY_MILLISECOND) {
          continue;
        }

        const sameNotification = candidateMetadata.stakingType === comparedMetadata.stakingType && candidateMetadata.stakingSlug === comparedMetadata.stakingSlug;

        if (sameNotification) {
          return false;
        }
      }
    }

    return true;
  }

  async validateAndWriteNotificationsToDB (notifications: _BaseNotificationInfo[], address: string) {
    const proxyId = this.keyringService.context.belongUnifiedAccount(address) || address;
    const newNotifications: _NotificationInfo[] = [];
    const unreadNotifications = await this.getNotificationsByParams({
      notificationTab: NotificationTab.UNREAD,
      proxyId
    });

    for (const notification of notifications) {
      if (this.passValidateNotification(notification, unreadNotifications)) {
        newNotifications.push({
          ...notification,
          proxyId
        });
      }
    }

    await this.dbService.upsertNotifications(newNotifications);
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
    this.cleanUpOldNotifications()
      .catch(console.error);

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
    return Promise.resolve(undefined);
  }
}
