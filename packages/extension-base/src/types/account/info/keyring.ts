// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import type { KeyringPair$Meta } from '@subwallet/keyring/types';
import type { KeypairType } from '@polkadot/util-crypto/types';

export interface AbstractAddressJson extends KeyringPair$Meta {
  address: string;
  type?: KeypairType;
  whenCreated?: number;
  name?: string;
}

/**
 * @interface AccountExternalData
 * @prop {boolean} [isExternal] - Is external account
 * @prop {boolean} [isHardware] - Is hardware account
 * @prop {boolean} [isReadOnly] - Is readonly account
 * @prop {boolean} [isHidden] - Is hidden account
 * */
export interface AccountExternalData {
  /** Is external account */
  isExternal?: boolean;
  /** Is hardware account */
  isHardware?: boolean;
  /** Is readonly account */
  isReadOnly?: boolean;
  /** Is hidden account */
  isHidden?: boolean;
}

/**
 * @interface AccountLedgerData
 * @prop {boolean} [isGeneric] - Is generic account
 * @prop {number} [accountIndex] - Ledger's account index
 * @prop {number} [addressOffset] - Ledger's address offset
 * @prop {string|null} [genesisHash] - Ledger's genesisHash
 * @prop {string|null} [originGenesisHash] - Ledger's originGenesisHash
 * @prop {string[]} [availableGenesisHashes] - Ledger's availableGenesisHashes
 * */
export interface AccountLedgerData {
  /** Is generic ledger account */
  isGeneric?: boolean;
  /** Ledger's account index */
  accountIndex?: number;
  /** Ledger's address offset */
  addressOffset?: number;
  /** Ledger's genesisHash */
  genesisHash?: string | null;
  /** Ledger's originGenesisHash */
  originGenesisHash?: string | null;
  /** Ledger's availableGenesisHashes */
  availableGenesisHashes?: string[];
}

/**
 * @interface AccountInjectData
 * @prop {boolean} [isInjected] - Is injected account
 * @prop {string} [source] - Account's source
 * */
export interface AccountInjectData {
  /** Is injected account */
  isInjected?: boolean;
  /** Account's source */
  source?: string;
}

/**
 * @interface AccountDeriveData
 * @prop {string} [parentAddress] - Parent's address
 * @prop {string} [suri] - Derivate path
 * */
export interface AccountDeriveData {
  /** Parent's address */
  parentAddress?: string;
  /** Derivate path */
  suri?: string;
}

/**
 * Represents the actions associated with an account.
 * @interface AccountActionData
 * @prop {string[]} accountActions - A list of account-specific actions. These could be actions like 'derive', 'export', etc., that are applicable to the account.
 * @prop {ExtrinsicType[]} transactionActions - A list of transaction types that the account can initiate. This is dependent on the blockchain's supported extrinsic types, such as 'transfer', 'bond', etc.
 */
export interface AccountActionData {
  accountActions: string[];
  transactionActions: ExtrinsicType[];
}

/**
 * @interface AccountJson
 * @extends AbstractAddressJson
 * @extends AccountLedgerData
 * @extends AccountInjectData
 * @extends AccountDeriveData
 * @prop {boolean} [isExternal] - Is external account
 * @prop {boolean} [isHidden] - Is hidden account
 * @prop {boolean} [isInjected] - Is injected account
 * @prop {boolean} [isGeneric] - Is generic account
 * @prop {boolean} [isMasterAccount] - Is master account - account has seed
 * @prop {boolean} [isMasterPassword] - Account has migrated with wallet password
 * @prop {boolean} [isReadOnly] - Is readonly account
 * @prop {boolean} [isSubWallet] - Import from SubWallet
 * @prop {boolean} [pendingMigrate] - Pending migrate password
 * @prop {string} [source] - Account's source
 * @prop {string} [suri] - Derivate path
 * */
export interface AccountJson extends AbstractAddressJson, AccountExternalData, AccountLedgerData, AccountInjectData, AccountDeriveData, AccountActionData {
  /** Is master account - account has seed */
  isMasterAccount?: boolean;
  /** Account has migrated with wallet password */
  isMasterPassword?: boolean;
  /** Import from SubWallet */
  isSubWallet?: boolean;
  /** Pending migrate password */
  pendingMigrate?: boolean;
}

export interface AddressJson extends AbstractAddressJson {
  isRecent?: boolean;
  recentChainSlugs?: string[];
}
