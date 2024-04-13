// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { BaseRequestSign } from '@subwallet/extension-base/background/KoniTypes';

import { FeeChainType, FeeDetail, TransactionFee } from '../fee';

export interface RequestSubscribeTransfer extends TransactionFee {
  address: string;
  chain: string;
  token?: string;
  isXcmTransfer?: boolean;
  destChain: string;
}

export interface ResponseSubscribeTransfer {
  id: string;
  maxTransferable: string;
  feeOptions: FeeDetail;
  feeType: FeeChainType;
}

export interface RequestSubmitTransfer extends BaseRequestSign, TransactionFee {
  chain: string;
  from: string;
  to: string;
  tokenSlug: string;
  transferAll: boolean;
  value: string;
}
