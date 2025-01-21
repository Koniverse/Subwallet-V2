// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { _ChainInfo } from '@subwallet/chain-list/types';
import { AccountJson } from '@subwallet/extension-base/types';

export type LedgerMustCheckType = 'polkadot' | 'migration' | 'unnecessary';

export enum ValidationCondition {
  IS_NOT_NULL = 'IS_NOT_NULL',
  IS_ADDRESS = 'IS_ADDRESS',
  IS_VALID_ADDRESS_FOR_ECOSYSTEM = 'IS_VALID_ADDRESS_FOR_ECOSYSTEM',
  IS_VALID_SUBSTRATE_ADDRESS_FORMAT = 'IS_VALID_SUBSTRATE_ADDRESS_FORMAT',
  IS_VALID_TON_ADDRESS_FORMAT = 'IS_VALID_TON_ADDRESS_FORMAT',
  IS_VALID_CARDANO_ADDRESS_FORMAT = 'IS_VALID_CARDANO_ADDRESS_FORMAT',
  IS_NOT_DUPLICATE_ADDRESS = 'IS_NOT_DUPLICATE_ADDRESS',
  IS_SUPPORT_LEDGER_ACCOUNT = 'IS_SUPPORT_LEDGER_ACCOUNT'
}

export enum ActionType {
  SEND_FUND = 'SEND_FUND',
  SEND_NFT = 'SEND_NFT',
  SWAP = 'SWAP'
}

export interface ValidateRecipientParams {
  srcChain: string,
  destChainInfo: _ChainInfo,
  fromAddress: string,
  toAddress: string,
  account: AccountJson | null,
  actionType: ActionType,
  autoFormatValue?: boolean,
  allowLedgerGenerics: string[]
}
