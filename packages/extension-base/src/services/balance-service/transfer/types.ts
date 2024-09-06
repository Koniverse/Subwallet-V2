// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { _ChainInfo } from '@subwallet/chain-list/types';
import { AccountJson } from '@subwallet/extension-base/types';

import { isEthereumAddress } from '@polkadot/util-crypto';

export type LedgerMustCheckType = 'polkadot' | 'migration' | 'unnecessary';

export function ledgerMustCheckNetwork (account: AccountJson | null): LedgerMustCheckType {
  if (account && account.isHardware && account.isGeneric && !isEthereumAddress(account.address)) {
    return account.originGenesisHash ? 'migration' : 'polkadot';
  } else {
    return 'unnecessary';
  }
}

export enum ValidationCondition {
  IS_NOT_NULL = 'IS_NOT_NULL',
  IS_ADDRESS = 'IS_ADDRESS',
  IS_VALID_ADDRESS = 'IS_VALID_ADDRESS',
  IS_VALID_SUBSTRATE_ADDRESS_FORMAT = 'IS_VALID_SUBSTRATE_ADDRESS_FORMAT',
  IS_NOT_DUPLICATE_ADDRESS = 'IS_NOT_DUPLICATE_ADDRESS',
  IS_SUPPORT_LEDGER_ACCOUNT = 'IS_SUPPORT_LEDGER_ACCOUNT'
}

export const LEDGER_GENERIC_ALLOW_NETWORKS = ['polkadot', 'statemint', 'bridgeHubPolkadot', 'collectives', 'centrifuge', 'manta_network', 'ajunaPolkadot', 'astar', 'bifrost_dot', 'hydradx_main', 'kusama', 'encointer', 'statemine', 'bridgeHubKusama', 'peopleKusama', 'altair', 'bajun', 'bifrost', 'calamari', 'shiden', 'tinkernet', 'rococo', 'rococo_assethub', 'hydradx_rococo', 'bifrost_testnet', 'westend', 'shibuya'];

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
  autoFormatValue?: boolean
}
