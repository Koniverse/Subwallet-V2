// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { FeeCustom } from '@subwallet/extension-base/types';

export type FeeDefaultOption = 'slow' | 'average' | 'fast';
export type FeeOption = FeeDefaultOption | 'custom';

export type TransactionFee = {
  feeOption?: FeeOption;
  feeCustom?: FeeCustom;
}
