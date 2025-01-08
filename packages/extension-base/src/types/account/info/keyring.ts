// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { KeypairType, KeyringPair$Meta } from '@subwallet/keyring/types';

import { _AssetType } from '@subwallet/chain-list/types';
import { ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';

export interface AbstractAddressJson extends KeyringPair$Meta {
  address: string;
  type?: KeypairType;
  whenCreated?: number;
  name?: string;
}

/**
 * @interface AccountExternalData
 * @prop {boolean} [isMasterAccount] - Is master account - account has seed
 * @prop {boolean} [isMasterPassword] - Account has migrated with wallet password
 * @prop {boolean} [isExternal] - Is external account
 * @prop {boolean} [isHardware] - Is hardware account
 * @prop {boolean} [isReadOnly] - Is readonly account
 * @prop {boolean} [isHidden] - Is hidden account
 * */
export interface AccountExternalData {
  /** Is master account - account has seed */
  isMasterAccount?: boolean;
  /** Account has migrated with wallet password */
  isMasterPassword?: boolean;
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
  /** Is Ledger recovery chain */
  isLedgerRecovery?: boolean;
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
 * @prop {string} [suri] - Substrate: Derivation path | Other: Brief for the derivation path
 * @prop {string} [derivationPath] - Derivation path
 * */
export interface AccountDeriveData {
  /** Parent's address */
  parentAddress?: string;
  /**
   * - Substrate: Derivation path
   * - Other: Brief for the derivation path
   * */
  suri?: string;
  /** Derivation path */
  derivationPath?: string;
}

/**
 * Represents the comprehensive metadata associated with an account, combining various aspects of account data.
 * This interface extends from multiple specific metadata interfaces to provide a unified view of an account's metadata.
 * It includes external, ledger, injected, and derived account data, offering a detailed perspective on the account's characteristics and origins.
 *
 * @interface AccountMetadataData
 * Represents the comprehensive metadata associated with an account. This interface aggregates various aspects of account data to provide a unified view of an account's metadata. It extends from multiple specific metadata interfaces, each covering a different dimension of account information.
 *
 * @extends AccountExternalData - Includes data about the account's external status, hardware wallet status, read-only status, and hidden status.
 * @extends AccountLedgerData - Contains information specific to Ledger hardware wallets, such as account index and genesis hash.
 * @extends AccountInjectData - Covers data related to injected accounts, including the source of the injection.
 * @extends AccountDeriveData - Holds information about derived accounts, including the parent address and derivation path (suri).
 */
export interface AccountMetadataData extends AccountExternalData, AccountLedgerData, AccountInjectData, AccountDeriveData {}

export enum AccountSignMode {
  PASSWORD = 'password',
  QR = 'qr',
  LEGACY_LEDGER = 'legacy-ledger',
  GENERIC_LEDGER = 'generic-ledger',
  READ_ONLY = 'readonly',
  ALL_ACCOUNT = 'all',
  INJECTED = 'injected',
  UNKNOWN = 'unknown'
}

export enum AccountChainType {
  SUBSTRATE = 'substrate',
  ETHEREUM = 'ethereum',
  BITCOIN = 'bitcoin',
  TON = 'ton',
  CARDANO = 'cardano'
}

export const ACCOUNT_CHAIN_TYPE_ORDINAL_MAP: Record<string, number> = {
  [AccountChainType.SUBSTRATE]: 1,
  [AccountChainType.ETHEREUM]: 2,
  [AccountChainType.TON]: 3,
  [AccountChainType.CARDANO]: 4,
  [AccountChainType.BITCOIN]: 5
};

export const SUPPORTED_ACCOUNT_CHAIN_TYPES = ['substrate', 'ethereum', 'ton', 'cardano'];

export enum AccountActions {
  DERIVE = 'DERIVE',
  EXPORT_MNEMONIC = 'EXPORT_MNEMONIC',
  EXPORT_PRIVATE_KEY = 'EXPORT_PRIVATE_KEY',
  EXPORT_JSON = 'EXPORT_JSON',
  EXPORT_QR = 'EXPORT_QR',
  TON_CHANGE_WALLET_CONTRACT_VERSION = 'TON_CHANGE_WALLET_CONTRACT_VERSION',
}

/**
 * Represents the actions associated with an account.
 * @interface AccountActionData
 * @prop {AccountChainType} chainType - The chain type will account used on
 * @prop {AccountActions[]} accountActions - A list of account-specific actions. These could be actions like 'derive', 'export', etc., that are applicable to the account.
 * @prop {ExtrinsicType[]} transactionActions - A list of transaction types that the account can initiate. This is dependent on the blockchain's supported extrinsic types, such as 'transfer', 'bond', etc.
 * @prop {AccountSignMode} signMode - Account sign mode
 * @prop {string} [specialChain] - Optional the special chain, which account can only be used on
 * @prop {_AssetType[]} tokenTypes - Asset types, which account can be used
 */
export interface AccountActionData {
  chainType: AccountChainType;
  accountActions: AccountActions[];
  transactionActions: ExtrinsicType[];
  signMode: AccountSignMode;
  specialChain?: string;
  tokenTypes: _AssetType[];
  proxyId?: string;
}

/**
 * @interface AccountJson
 * @extends AbstractAddressJson
 * @extends AccountMetadataData
 * @extends AccountActionData
 * @prop {boolean} [isSubWallet] - Import from SubWallet
 * @prop {boolean} [pendingMigrate] - Pending migrate password
 * */
export interface AccountJson extends AbstractAddressJson, AccountMetadataData, AccountActionData {
  /** Import from SubWallet */
  isSubWallet?: boolean;
  /** Pending migrate password */
  pendingMigrate?: boolean;
  type: KeypairType;
}

export interface AddressJson extends AbstractAddressJson {
  chainType: AccountChainType;
  isRecent?: boolean;
  recentChainSlugs?: string[];
}
