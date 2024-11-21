// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { _NotificationInfo } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';

export interface RequestClaimBridge {
  address: string,
  chain: string,
  notification: _NotificationInfo
}
