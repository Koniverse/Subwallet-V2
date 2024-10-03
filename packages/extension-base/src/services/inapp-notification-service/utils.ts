// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { YieldPoolType } from '@subwallet/extension-base/types';

export function getWithdrawNotificationDescription (amount: string, symbol: string, stakingType: YieldPoolType) {
  return `You has ${amount} ${symbol} ${stakingType} to withdraw`;
}
