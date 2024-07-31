// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountProxy } from './proxy';

// all Accounts and the address of the current Account
export interface AccountsWithCurrentAddress {
  accounts: AccountProxy[];
  currentAccountProxy?: string;
}

export interface CurrentAccountInfo {
  proxyId: string;
  /** @deprecated */
  address?: string;
}
