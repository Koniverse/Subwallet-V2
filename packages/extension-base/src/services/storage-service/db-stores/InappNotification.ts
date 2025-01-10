// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ALL_ACCOUNT_KEY } from '@subwallet/extension-base/constants';
import { _NotificationInfo, NotificationTab } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';
import { getIsTabRead } from '@subwallet/extension-base/services/inapp-notification-service/utils';
import BaseStore from '@subwallet/extension-base/services/storage-service/db-stores/BaseStore';
import { GetNotificationParams, RequestSwitchStatusParams } from '@subwallet/extension-base/types/notification';
import { liveQuery } from 'dexie';

export default class InappNotificationStore extends BaseStore<_NotificationInfo> {
  async getNotificationInfo (id: string) {
    return this.table.get(id);
  }

  async getAll () {
    return this.table.toArray();
  }

  async getNotificationsByParams (params: GetNotificationParams) {
    const { notificationTab, proxyId } = params;
    const isAllAccount = proxyId === ALL_ACCOUNT_KEY;
    const isTabAll = notificationTab === NotificationTab.ALL;

    if (isTabAll && isAllAccount) {
      return this.getAll();
    }

    const filteredTable = this.table.filter((item) => {
      const matchesProxyId = item.proxyId === proxyId;
      const matchesReadStatus = item.isRead === getIsTabRead(notificationTab);

      if (isTabAll) {
        return matchesProxyId;
      }

      if (isAllAccount) {
        return matchesReadStatus;
      }

      return matchesProxyId && matchesReadStatus;
    });

    return filteredTable.toArray();
  }

  updateNotificationProxyId (proxyIds: string[], newProxyId: string, newName: string) {
    this.table.where('proxyId')
      .anyOfIgnoreCase(proxyIds)
      .modify((item) => {
        item.proxyId = newProxyId;
        item.title = item.title.replace(/\[.*?\]/, `[${newName}]`);
      });
  }

  async cleanUpOldNotifications (overdueTime: number) {
    const currentTimestamp = Date.now();

    return this.table
      .filter((item) => item.time <= currentTimestamp - overdueTime)
      .delete();
  }

  subscribeUnreadNotificationsCount () {
    return liveQuery(
      async () => {
        return await this.getUnreadNotificationsCountMap();
      }
    );
  }

  async getUnreadNotificationsCountMap () {
    const unreadNotifications = await this.table.filter((item) => !item.isRead).toArray();

    return unreadNotifications.reduce((countMap, item) => {
      countMap[item.proxyId] = (countMap[item.proxyId] || 0) + 1;

      return countMap;
    }, {} as Record<string, number>);
  }

  markAllRead (proxyId: string) {
    if (proxyId === ALL_ACCOUNT_KEY) {
      return this.table.toCollection().modify({ isRead: true });
    }

    return this.table.where('proxyId')
      .equalsIgnoreCase(proxyId)
      .modify({ isRead: true });
  }

  switchReadStatus (params: RequestSwitchStatusParams) {
    return this.table.where('id')
      .equals(params.id)
      .modify({ isRead: !params.isRead });
  }

  removeAccountNotifications (proxyId: string) {
    return this.table.where('proxyId').equalsIgnoreCase(proxyId).delete();
  }
}
