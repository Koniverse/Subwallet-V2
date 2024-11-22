// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NotificationActionType } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';
import { getAvailBridgeClaimDescription, getClaimDescription, getReceiveDescription, getSendDescription, getWithdrawDescription } from '@subwallet/extension-base/services/inapp-notification-service/utils';

export const NotificationTitleMap = {
  [NotificationActionType.WITHDRAW]: '[{{accountName}}] WITHDRAW {{tokenSymbol}}',
  [NotificationActionType.CLAIM]: '[{{accountName}}] CLAIM {{tokenSymbol}}',
  [NotificationActionType.SEND]: '[{{accountName}}] SEND {{tokenSymbol}}',
  [NotificationActionType.RECEIVE]: '[{{accountName}}] RECEIVE {{tokenSymbol}}',
  [NotificationActionType.CLAIM_AVAIL_BRIDGE_ON_AVAIL]: '[{{accountName}}] CLAIM {{tokenSymbol}}',
  [NotificationActionType.CLAIM_AVAIL_BRIDGE_ON_ETHEREUM]: '[{{accountName}}] CLAIM {{tokenSymbol}}'
};

export const NotificationDescriptionMap = {
  [NotificationActionType.WITHDRAW]: getWithdrawDescription,
  [NotificationActionType.CLAIM]: getClaimDescription,
  [NotificationActionType.SEND]: getSendDescription,
  [NotificationActionType.RECEIVE]: getReceiveDescription,
  [NotificationActionType.CLAIM_AVAIL_BRIDGE_ON_AVAIL]: getAvailBridgeClaimDescription,
  [NotificationActionType.CLAIM_AVAIL_BRIDGE_ON_ETHEREUM]: getAvailBridgeClaimDescription
};

export const ONE_DAY_MILLISECOND = 1000 * 24 * 60 * 60;
