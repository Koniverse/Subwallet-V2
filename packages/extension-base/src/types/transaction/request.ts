// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

// eslint-disable-next-line @typescript-eslint/ban-types
import { TransactionWarningType } from '@subwallet/extension-base/types';

export type BaseRequestSign = {
  ignoreWarnings?: TransactionWarningType[];
};
export type InternalRequestSign<T> = T & BaseRequestSign;

export interface RequestBaseTransfer {
  from: string;
  to: string;
  tokenSlug: string;
  value?: string;
  transferAll?: boolean;
  transferBounceable?: boolean;
}

export interface RequestCheckTransfer extends RequestBaseTransfer {
  networkKey: string,
  orderId?: string,
  service?: string
}

export type RequestTransfer = InternalRequestSign<RequestCheckTransfer>;

export interface RequestCheckCrossChainTransfer extends RequestBaseTransfer {
  value: string;
  originNetworkKey: string,
  destinationNetworkKey: string,
  showExtraWarning?: boolean
}

export type RequestCrossChainTransfer = InternalRequestSign<RequestCheckCrossChainTransfer>;
