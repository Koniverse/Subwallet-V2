// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NotificationActionType } from './interfaces';
import { getAvailBridgeClaimDescription, getClaimDescription, getReceiveDescription, getSendDescription, getWaitPolygonBridgeDescription, getWithdrawDescription } from './utils';

export const NotificationTitleMap = {
  [NotificationActionType.WITHDRAW]: '[{{accountName}}] WITHDRAW {{tokenSymbol}}',
  [NotificationActionType.CLAIM]: '[{{accountName}}] CLAIM {{tokenSymbol}}',
  [NotificationActionType.SEND]: '[{{accountName}}] SEND {{tokenSymbol}}',
  [NotificationActionType.RECEIVE]: '[{{accountName}}] RECEIVE {{tokenSymbol}}',
  [NotificationActionType.CLAIM_AVAIL_BRIDGE_ON_AVAIL]: '[{{accountName}}] CLAIM {{tokenSymbol}}',
  [NotificationActionType.CLAIM_AVAIL_BRIDGE_ON_ETHEREUM]: '[{{accountName}}] CLAIM {{tokenSymbol}}',
  [NotificationActionType.HAVE_TO_WAIT_POLYGON_BRIDGE]: '[{{accountName}}] BRIDGE {{tokenSymbol}}'
};

export const NotificationDescriptionMap = {
  [NotificationActionType.WITHDRAW]: getWithdrawDescription,
  [NotificationActionType.CLAIM]: getClaimDescription,
  [NotificationActionType.SEND]: getSendDescription,
  [NotificationActionType.RECEIVE]: getReceiveDescription,
  [NotificationActionType.CLAIM_AVAIL_BRIDGE_ON_AVAIL]: getAvailBridgeClaimDescription,
  [NotificationActionType.CLAIM_AVAIL_BRIDGE_ON_ETHEREUM]: getAvailBridgeClaimDescription,
  [NotificationActionType.HAVE_TO_WAIT_POLYGON_BRIDGE]: getWaitPolygonBridgeDescription
};

export const ONE_DAY_MILLISECOND = 1000 * 24 * 60 * 60;
