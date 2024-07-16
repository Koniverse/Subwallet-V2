// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { TransactionError } from '@subwallet/extension-base/background/errors/TransactionError';
import { _Address, BasicTxErrorType } from '@subwallet/extension-base/background/KoniTypes';
import { AssetBalance, TransactionState, TransactionStateChanges, TransactionValidationArgs } from '@subwallet/extension-base/core/logic-validation/types';

export function applyChanges (beforeState: TransactionState, stateChanges: TransactionStateChanges): TransactionState {
  const afterBalanceMap: Record<_Address, AssetBalance[]> = {};

  Object.entries(beforeState.balances).forEach(([address, balances]) => {
    afterBalanceMap[address] = [];
    const assetChanges = stateChanges.changes[address];

    const totalBalanceChangesByAsset: Record<string, bigint> = {};

    // calculate total balance changes by asset
    assetChanges.forEach((change) => {
      const assetSlug = change.asset.slug;

      if (assetSlug in totalBalanceChangesByAsset) {
        totalBalanceChangesByAsset[assetSlug] += change.amount;
      } else {
        totalBalanceChangesByAsset[assetSlug] = change.amount;
      }
    });

    // apply total balance changes to assets
    balances.forEach((balance) => {
      const totalAssetChange = totalBalanceChangesByAsset[balance.asset.slug];

      afterBalanceMap[address].push({
        ...balance,
        amount: balance.amount + totalAssetChange
      });
    });
  });

  return {
    ...beforeState,
    balances: afterBalanceMap
  };
}

export function getAppliedValidations (stateChanges: TransactionStateChanges): Record<_Address, Array<(args: TransactionValidationArgs) => TransactionError>> {
  const rs: Array<(args: TransactionValidationArgs) => TransactionError> = [];

  // common
  rs.push(nativeBalanceMustExceedEd);

  return rs;
}

export function balanceMustExceedEd (args: TransactionValidationArgs): TransactionError {
  return new TransactionError(BasicTxErrorType.NOT_ENOUGH_EXISTENTIAL_DEPOSIT);
}

export function nativeBalanceMustExceedEd (args: TransactionValidationArgs): TransactionError {
  return new TransactionError(BasicTxErrorType.NOT_ENOUGH_EXISTENTIAL_DEPOSIT);
}

export function mustSendAtLeastMin (args: TransactionValidationArgs): TransactionError {
  return new TransactionError(BasicTxErrorType.NOT_ENOUGH_EXISTENTIAL_DEPOSIT);
}
