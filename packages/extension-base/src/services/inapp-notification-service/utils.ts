// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { YieldPoolType } from '@subwallet/extension-base/types';

export function getWithdrawDescription (amount: string, symbol: string, stakingType: YieldPoolType) {
  return `You has ${amount} ${symbol} ${stakingType} to withdraw`;
}

export function getClaimDescription (amount: string, symbol: string, stakingType: YieldPoolType) {
  return `You has ${amount} ${symbol} ${stakingType} to claim`;
}

export function getSendDescription (amount: string, symbol: string) {
  return `You have just sent ${amount} ${symbol}`;
}

export function getReceiveDescription (amount: string, symbol: string) {
  return `You have just received ${amount} ${symbol}`;
}
