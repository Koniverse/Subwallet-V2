// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { AccountProxy } from '@subwallet/extension-base/types';

export const hasAnyAccountForMigration = (allAccountProxies: AccountProxy[]) => {
  for (const account of allAccountProxies) {
    if (account.isNeedMigrateUnifiedAccount) {
      return true;
    }
  }

  return false;
};
