// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { RequestMigrateSoloAccount, RequestMigrateUnifiedAccount, RequestPingSessionId, RequestRequiredMigrateAccountStatus, ResponseIsShowMigrationAccount, ResponseMigrateSoloAccount, ResponseMigrateUnifiedAccount } from '@subwallet/extension-base/background/KoniTypes';
import { sendMessage } from '@subwallet/extension-koni-ui/messaging';

export function isShowMigrationAccount (): Promise<ResponseIsShowMigrationAccount> {
  return sendMessage('pri(migrate.isShowMigrationAccount)');
}

export function updateRequiredMigrateAccountStatus (request: RequestRequiredMigrateAccountStatus): Promise<boolean> {
  return sendMessage('pri(migrate.updateRequiredMigrateAccountStatus)', request);
}

export function migrateUnifiedAccount (request: RequestMigrateUnifiedAccount): Promise<ResponseMigrateUnifiedAccount> {
  return sendMessage('pri(migrate.migrateUnifiedAccount)', request);
}

export function migrateSoloAccount (request: RequestMigrateSoloAccount): Promise<ResponseMigrateSoloAccount> {
  return sendMessage('pri(migrate.migrateSoloAccount)', request);
}

export function pingSessionId (request: RequestPingSessionId) {
  return sendMessage('pri(migrate.pingSessionId)', request);
}
