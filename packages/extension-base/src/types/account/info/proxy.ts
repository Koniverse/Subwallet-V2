// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountJson } from './keyring';

export interface AccountProxyData {
  id: string;
  name: string;
}

export type AccountProxyStoreData = Record<string, AccountProxyData>;

export interface AccountProxy extends AccountProxyData {
  accounts: AccountJson[];
}

export type AccountProxyMap = Record<string, AccountProxy>

export interface ModifyPairData {
  key: string;
  applied: boolean;
  migrated: boolean;
  accountProxyId?: string;
}

export type ModifyPairStoreData = Record<string, ModifyPairData>;
