// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ALL_ACCOUNT_KEY } from '@subwallet/extension-base/constants';
import { NotificationInfo, NotificationTab } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';
import BaseStore from '@subwallet/extension-base/services/storage-service/db-stores/BaseStore';
import { GetNotificationParams } from '@subwallet/extension-base/types/notification';

export default class InappNotificationStore extends BaseStore<NotificationInfo> {
  async getNotificationInfo (id: string) {
    return this.table.get(id);
  }

  async getAll () {
    return this.table.toArray();
  }

  async getNotificationsByParams (params: GetNotificationParams) {
    const { address, notificationTab } = params;
    const isAllAccount = address === ALL_ACCOUNT_KEY;

    const getIsReadFromParams = (notificationTab: NotificationTab) => {
      if (notificationTab === NotificationTab.UNREAD) {
        return false;
      }

      if (notificationTab === NotificationTab.READ) {
        return true;
      }

      return undefined;
    };

    if (isAllAccount && notificationTab === NotificationTab.ALL) {
      return this.getAll();
    }

    const filteredTable = this.table.filter((item) => {
      const matchesAddress = item.address === address;
      const matchesReadStatus = item.isRead === getIsReadFromParams(notificationTab);

      if (notificationTab === NotificationTab.ALL) {
        return matchesAddress;
      }

      if (isAllAccount) {
        return matchesReadStatus;
      }

      return matchesAddress && matchesReadStatus;
    });

    return filteredTable.toArray();
  }

  getAllUnreadNotifications () {
    return this.table.filter((item) => !item.isRead).count();
  }

  markAllRead (address: string) {
    if (address === ALL_ACCOUNT_KEY) {
      return this.table.where('address')
        .equalsIgnoreCase(address)
        .modify({ isRead: true });
    }

    return this.table.where('address')
      .equalsIgnoreCase(address)
      .modify({ isRead: true });
  }

  markRead (notification: NotificationInfo) {
    const id = notification.id;
    const address = notification.address;

    return this.table.where('address')
      .equalsIgnoreCase(address)
      .and((notification) => notification.id === id)
      .modify({ isRead: true });
  }

  markUnread (notification: NotificationInfo) {
    const id = notification.id;
    const address = notification.address;

    return this.table.where('address')
      .equalsIgnoreCase(address)
      .and((notification) => notification.id === id)
      .modify({ isRead: false });
  }

  changeReadStatus (notification: NotificationInfo) {
    const id = notification.id;
    const address = notification.address;

    return this.table.where('address')
      .equalsIgnoreCase(address)
      .and((notification) => notification.id === id)
      .modify({ isRead: !notification.isRead });
  }
}
