// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AAAccount, AAProxy } from '@subwallet/extension-base/types';
import { KeyringPairs$Json } from '@subwallet/ui-keyring/types';

import { AccountChainType, AccountJson } from './account';

/**
 * Represents the basic data structure for an account proxy.
 *
 * @interface AccountProxyData
 * @prop {string} id - The unique identifier for the proxy account.
 * @prop {string} name - The name of the proxy account.
 * @prop {string} [parentId] - The identifier of the parent account proxy, from which it is derived.
 * @prop {string} [suri] - Derivate path.
 */
export interface AccountProxyData {
  id: string;
  name: string;
  parentId?: string;
  suri?: string;
}

/**
 * Represents a mapping of unique identifiers to account proxy data.
 * This type is used to store and manage account proxy information efficiently,
 * allowing for quick access and manipulation of proxy account details.
 *
 * @typedef {Record<string, AccountProxyData>} AccountProxyStoreData
 */
export type AccountProxyStoreData = Record<string, AccountProxyData>;

export enum AccountProxyType {
  ALL_ACCOUNT = 'all',
  SOLO = 'solo',
  UNIFIED = 'unified',
  QR = 'qr',
  LEDGER = 'ledger',
  READ_ONLY = 'readonly',
  INJECTED = 'injected',
  UNKNOWN = 'unknown'
}

/**
 * @interface AccountProxy
 * @extends AccountProxyData - Inherits properties from AccountProxyData.
 * @description Represents an account proxy, which includes additional details and associated accounts.
 *
 * @prop {AccountJson[]} accounts - An array of `AccountJson` objects representing the accounts associated with this proxy.
 * @prop {AccountProxyType} accountType - The type of the account proxy.
 * @prop {AccountChainType[]} chainTypes - An array of network types associated with this proxy.
 * @prop {string[]} specialChains - List chains, which account proxy can only be used on, if not provided, account proxy can be used on all chains
 */
export interface AccountProxy extends AccountProxyData {
  accounts: AccountJson[];
  accountType: AccountProxyType;
  chainTypes: AccountChainType[];
  specialChains: string[];
  children?: string[];
}

export type AccountProxyMap = Record<string, AccountProxy>

export interface AccountProxyExtra extends AccountProxy {
  isExistAccount: boolean;
  isExistName: boolean;
}

export interface ModifyPairData {
  key: string;
  migrated: boolean;
  accountProxyId?: string;
}

export type ModifyPairStoreData = Record<string, ModifyPairData>;

export interface KeyringPairs$JsonV2 extends KeyringPairs$Json {
  modifyPairs?: ModifyPairStoreData;
  accountProxies?: AccountProxyStoreData;
}

export interface AAProxyConverted extends Omit<AAProxy, 'accounts'> {
  accounts: AccountJson[];
}

export type AAProxyConvertedMap = Record<string, AAProxyConverted>;
