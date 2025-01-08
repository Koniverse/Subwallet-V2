// Copyright 2019-2022 @subwallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ExtrinsicType, TransactionHistoryItem } from '@subwallet/extension-base/background/KoniTypes';
import BaseMigrationJob from '@subwallet/extension-base/services/migration-service/Base';
import Dexie from 'dexie';

export default class MigrateTransactionHistoryBridge extends BaseMigrationJob {
  public override async run (): Promise<void> {
    const state = this.state;
    const newTransactionItems: TransactionHistoryItem[] = [];

    try {
      const db = new Dexie('SubWalletDB_v2');
      const dexieDB = await db.open();
      const transactionTable = dexieDB.table('transactions');

      const oldTransactionData = (await transactionTable.toArray()) as TransactionHistoryItem[];

      const claimAvailBridgeTransactions = oldTransactionData.filter((item) => item.type as string === 'claim.claim_avail_bridge');

      claimAvailBridgeTransactions.forEach((item) => {
        const newItem: TransactionHistoryItem = {
          ...item,
          type: ExtrinsicType.CLAIM_BRIDGE
        };

        newTransactionItems.push(newItem);
      });

      await state.dbService.upsertHistory(newTransactionItems);
    } catch (e) {
      this.logger.error(e);
    }
  }
}
