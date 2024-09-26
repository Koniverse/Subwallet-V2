// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NotificationInfo } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';
import BaseStore from '@subwallet/extension-base/services/storage-service/db-stores/BaseStore';

export default class InappNotificationStore extends BaseStore<NotificationInfo> {
  async getNotificationInfo (id: string) {
    return this.table.get(id);
  }
}
