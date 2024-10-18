// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NotificationActionType } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';
import { fetchStaticData } from '@subwallet/extension-base/utils';

const REMIND_NOTIFICATION_TIME_PROMISE = fetchStaticData<Record<NotificationActionType, number>>('config/remind-notification-time');

export const fetchLastestRemindNotificationTime = async () => {
  return await REMIND_NOTIFICATION_TIME_PROMISE;
};
