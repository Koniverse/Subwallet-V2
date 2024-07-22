// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountJson } from './keyring';

export interface AccountGroupData {
  id: string;
  name: string;
}

export type AccountGroupStoreData = Record<string, AccountGroupData>;

export interface AccountGroup extends AccountGroupData {
  accounts: AccountJson[];
}

export type AccountGroupMap = Record<string, AccountGroup>

export interface ModifyPairData {
  key: string;
  applied: boolean;
  migrated: boolean;
  accountGroupId?: string;
}

export type ModifyPairStoreData = Record<string, ModifyPairData>;
