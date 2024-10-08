// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ALL_ACCOUNT_KEY } from '@subwallet/extension-base/constants';
import { _NotificationInfo, NotificationTab } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';
import { getIsTabRead } from '@subwallet/extension-base/services/inapp-notification-service/utils';
import BaseStore from '@subwallet/extension-base/services/storage-service/db-stores/BaseStore';
import { GetNotificationParams } from '@subwallet/extension-base/types/notification';
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

  subscribeUnreadNotificationsCount () {
    return liveQuery(
      async () => {
        return await this.getUnreadNotificationsCountMap();
      }
    );
  }

  async getUnreadNotificationsCountMap () {
    const data = await this.table.filter((item) => !item.isRead).toArray();

    return data.reduce((acc, item) => {
      if (!acc[item.proxyId]) {
        acc[item.proxyId] = 1;
      }

      acc[item.proxyId] = acc[item.proxyId] + 1;

      return acc;
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

  changeReadStatus (notification: _NotificationInfo) {
    const id = notification.id;
    const address = notification.address;

    return this.table.where('address')
      .equalsIgnoreCase(address)
      .and((notification) => notification.id === id)
      .modify({ isRead: !notification.isRead });
  }
}
