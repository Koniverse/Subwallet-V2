// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { CronServiceInterface, ServiceStatus } from '@subwallet/extension-base/services/base/types';
import { ONE_DAY_MILLISECOND } from '@subwallet/extension-base/services/inapp-notification-service/consts';
import { _NotificationInfo, NotificationActionType, NotificationTab } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';
import DatabaseService from '@subwallet/extension-base/services/storage-service/DatabaseService';
import { GetNotificationCountResult, GetNotificationParams } from '@subwallet/extension-base/types/notification';

export class InappNotificationService implements CronServiceInterface {
  status: ServiceStatus;
  private readonly dbService: DatabaseService;

  constructor (dbService: DatabaseService) {
    this.status = ServiceStatus.NOT_INITIALIZED;
    this.dbService = dbService;
  }

  async markAllRead (address: string) {
    await this.dbService.markAllRead(address);
  }

  async changeReadStatus (notification: _NotificationInfo) {
    await this.dbService.changeReadStatus(notification);
  }

  public subscribeUnreadNotificationsCount (callback: (data: number) => void) {
    return this.dbService.subscribeUnreadNotificationsCount().subscribe(
      {
        next: callback
      }
    );
  }

  public async getUnreadNotificationsCount () {
    const unreadNotificationsCount = await this.dbService.getUnreadNotificationsCount();

    return { count: unreadNotificationsCount } as GetNotificationCountResult;
  }

  public async getNotificationsByParams (params: GetNotificationParams) {
    return await this.dbService.getNotificationsByParams(params);
  }

  passValidateNotification (candidateNotification: _NotificationInfo, notificationFromDB: _NotificationInfo[]) {
    if ([NotificationActionType.WITHDRAW, NotificationActionType.CLAIM].includes(candidateNotification.actionType)) {
      const { actionType, address, metadata, time } = candidateNotification;

      for (const notification of notificationFromDB) {
        const sameNotification = notification.address === address && notification.actionType === actionType && JSON.stringify(notification.metadata) === JSON.stringify(metadata); // todo: improve compare object
        const overdue = time - notification.time >= ONE_DAY_MILLISECOND;

        if (sameNotification && !overdue) {
          return false;
        }
      }
    }

    return true;
  }

  async validateAndWriteNotificationsToDB (notifications: _NotificationInfo[], address: string) {
    const newNotifications: _NotificationInfo[] = [];
    const unreadNotifications = await this.getNotificationsByParams({
      notificationTab: NotificationTab.UNREAD,
      address
    });

    for (const notification of notifications) {
      if (this.passValidateNotification(notification, unreadNotifications)) {
        newNotifications.push(notification);
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
