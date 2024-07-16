// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainAsset } from '@subwallet/chain-list/types';
import { _Address, ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';

export enum AssetChangeReason {
  NETWORK_FEE = 'NETWORK_FEE',
  SENDING_AMOUNT = 'SENDING_AMOUNT',
  RECEIVING_AMOUNT = 'RECEIVING_AMOUNT',
  SERVICE_FEE = 'SERVICE_FEE',
  ASSET_LOCK = 'ASSET_LOCK',
  ASSET_UNLOCK = 'ASSET_UNLOCK'
}

export type AssetBalance = {
  amount: bigint, // should be total balance, transferable + lock + ...
  asset: _ChainAsset,
  address: _Address
}

export type AssetChange = AssetBalance & { // amount in AssetChange can be negative depending on the reason
  reason: AssetChangeReason
}

export type TransactionStateChanges = {
  changes: Record<_Address, AssetChange[]>, // must include all asset changes for all senders and receivers
  context: ExtrinsicType
}

export type TransactionState = {
  sender: _Address,
  receiver: _Address,

  balances: Record<_Address, AssetBalance[]>
}

export type TransactionValidationArgs = {
  stateBefore: TransactionState,
  stateChanges: TransactionStateChanges,
  stateAfter: TransactionState
}
