// Copyright 2019-2022 @subwallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { TransactionHistoryItem } from '@subwallet/extension-base/background/KoniTypes';
import BaseMigrationJob from '@subwallet/extension-base/services/migration-service/Base';
import Dexie from 'dexie';

export default class MigrateTransactionsV2Store extends BaseMigrationJob {
  public override async run (): Promise<void> {
    const state = this.state;

    try {
      const db = new Dexie('SubWalletDB_v2');
      const dexieDB = await db.open();
      const transactionTable = dexieDB.table('transactions');
      const oldTransactionData = (await transactionTable.toArray()) as TransactionHistoryItem[];

      await state.historyService.addHistoryItems(oldTransactionData);
    } catch (e) {
      this.logger.error(e);
    }
  }
}
