// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

export interface CardanoAddressBalance {
  address: string;
  amount: CardanoBalanceItem[],
  stake_address: string,
  type: string, // todo: consider create interface for type
  script: boolean
}

export interface CardanoBalanceItem {
  unit: string,
  quantity: string
}
