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
    const { address, notificationTab } = params;
    const isAllAccount = address === ALL_ACCOUNT_KEY;
    const isTabAll = notificationTab === NotificationTab.ALL;

    if (isTabAll && isAllAccount) {
      return this.getAll();
    }

    const filteredTable = this.table.filter((item) => {
      const matchesAddress = item.address === address;
      const matchesReadStatus = item.isRead === getIsTabRead(notificationTab);

      if (isTabAll) {
        return matchesAddress;
      }

      if (isAllAccount) {
        return matchesReadStatus;
      }

      return matchesAddress && matchesReadStatus;
    });

    return filteredTable.toArray();
  }

  async getNotificationsByParams2 (params: GetNotificationParams) {
    const { address, notificationTab } = params;
    const isAllAccount = address === ALL_ACCOUNT_KEY;
    const isTabAll = notificationTab === NotificationTab.ALL;

    if (isAllAccount) {
      if (isTabAll) {
        return this.getAll();
      }

      return this.table.filter((item) => item.isRead === getIsTabRead(notificationTab)).toArray();
    } else {
      if (isTabAll) {
        return this.table.filter((item) => item.address === address).toArray();
      }

      return this.table.filter((item) => item.address === address && item.isRead === getIsTabRead(notificationTab)).toArray();
    }
  }

  subscribeUnreadNotificationsCount () {
    return liveQuery(
      async () => (await this.table.filter((item) => !item.isRead).count())
    );
  }

  getUnreadNotificationsCount () {
    return this.table.filter((item) => !item.isRead).count();
  }

  markAllRead (address: string) {
    if (address === ALL_ACCOUNT_KEY) {
      return this.table.toCollection().modify({ isRead: true });
    }

    return this.table.where('address')
      .equalsIgnoreCase(address)
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
