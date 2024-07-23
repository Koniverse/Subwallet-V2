// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountJson } from './keyring';

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

/**
 * @interface AccountProxy
 * @extends AccountProxyData - Inherits properties from AccountProxyData.
 * @prop {AccountJson[]} accounts - An array of `AccountJson` objects representing the accounts associated with this proxy.
 */
export interface AccountProxy extends AccountProxyData {
  accounts: AccountJson[];
}

export type AccountProxyMap = Record<string, AccountProxy>

export interface ModifyPairData {
  key: string;
  migrated: boolean;
  accountProxyId?: string;
}

export type ModifyPairStoreData = Record<string, ModifyPairData>;
