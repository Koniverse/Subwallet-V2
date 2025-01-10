// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { RequestMigrateSoloAccount, RequestMigrateUnifiedAndFetchEligibleSoloAccounts, RequestPingSession, ResponseMigrateSoloAccount, ResponseMigrateUnifiedAndFetchEligibleSoloAccounts } from '@subwallet/extension-base/background/KoniTypes';
import { sendMessage } from '@subwallet/extension-koni-ui/messaging';

export function migrateUnifiedAndFetchEligibleSoloAccounts (request: RequestMigrateUnifiedAndFetchEligibleSoloAccounts): Promise<ResponseMigrateUnifiedAndFetchEligibleSoloAccounts> {
  return sendMessage('pri(migrate.migrateUnifiedAndFetchEligibleSoloAccounts)', request);
}

export function migrateSoloAccount (request: RequestMigrateSoloAccount): Promise<ResponseMigrateSoloAccount> {
  return sendMessage('pri(migrate.migrateSoloAccount)', request);
}

export function pingSession (request: RequestPingSession) {
  return sendMessage('pri(migrate.pingSession)', request);
}
