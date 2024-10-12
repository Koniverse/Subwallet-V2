// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NotificationActionType } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';
import { getAvailBridgeClaimOnAvailDescription, getAvailBridgeClaimOnEthDescription, getClaimDescription, getReceiveDescription, getSendDescription, getWithdrawDescription } from '@subwallet/extension-base/services/inapp-notification-service/utils';

export const NotificationTitleMap = {
  [NotificationActionType.WITHDRAW]: 'Token Withdrawal',
  [NotificationActionType.CLAIM]: 'Token Claimable',
  [NotificationActionType.SEND]: 'Token Send',
  [NotificationActionType.RECEIVE]: 'Token Receive',
  [NotificationActionType.CLAIM_AVAIL_BRIDGE_ON_AVAIL]: 'Token Claimable',
  [NotificationActionType.CLAIM_AVAIL_BRIDGE_ON_ETHEREUM]: 'Token Claimable'
};

export const NotificationDescriptionMap = {
  [NotificationActionType.WITHDRAW]: getWithdrawDescription,
  [NotificationActionType.CLAIM]: getClaimDescription,
  [NotificationActionType.SEND]: getSendDescription,
  [NotificationActionType.RECEIVE]: getReceiveDescription,
  [NotificationActionType.CLAIM_AVAIL_BRIDGE_ON_AVAIL]: getAvailBridgeClaimOnAvailDescription,
  [NotificationActionType.CLAIM_AVAIL_BRIDGE_ON_ETHEREUM]: getAvailBridgeClaimOnEthDescription
};

export const ONE_DAY_MILLISECOND = 86400000;
