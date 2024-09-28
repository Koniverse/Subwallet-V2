// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NotificationInfo } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';
import BaseStore from '@subwallet/extension-base/services/storage-service/db-stores/BaseStore';

export default class InappNotificationStore extends BaseStore<NotificationInfo> {
  async getNotificationInfo (id: string) {
    return this.table.get(id);
  }

  async getAll () {
    return this.table.toArray();
  }

  getAllUnreadNotifications () {
    return this.table.filter((item) => !item.isRead).count();
  }

  markAllRead (address: string) {
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
}
