// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { KeyringPair$Json } from '@subwallet/keyring/types';

import { AccountProxyExtra, KeyringPairs$JsonV2 } from '../../info';

export interface RequestJsonGetAccountInfo {
  json: KeyringPair$Json;
  password: string;
}

export interface ResponseJsonGetAccountInfo {
  accountProxy: AccountProxyExtra;
}

// Restore account with json file (single account)
export interface RequestJsonRestoreV2 {
  file: KeyringPair$Json;
  password: string;
  address: string;
  isAllowed: boolean;
  withMasterPassword: boolean;
}

export interface RequestBatchJsonGetAccountInfo {
  json: KeyringPairs$JsonV2;
  password: string;
}

export interface ResponseBatchJsonGetAccountInfo {
  accountProxies: AccountProxyExtra[];
}

// Restore account with json file (multi account)
export interface RequestBatchRestoreV2 {
  file: KeyringPairs$JsonV2;
  password: string;
  isAllowed: boolean;
  proxyIds?: string[];
}
