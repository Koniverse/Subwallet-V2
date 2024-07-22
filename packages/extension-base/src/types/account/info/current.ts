// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountProxy } from './group';

// all Accounts and the address of the current Account
export interface AccountsWithCurrentAddress {
  accounts: AccountProxy[];
  currentAddress?: string;
}

export interface CurrentAccountInfo {
  address: string;
}
