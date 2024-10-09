// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { KeypairType } from '@subwallet/keyring/types';

import { AccountActions, AccountProxyType } from '@subwallet/extension-base/types';

export interface WordItem {
  index: number;
  label: string;
}

export enum AccountAddressType {
  ETHEREUM = 'ethereum',
  SUBSTRATE = 'substrate',
  ALL = 'all',
  UNKNOWN = 'unknown',
}

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

export type AccountChainAddress = {
  name: string;
  slug: string;
  address: string;
  accountType: KeypairType;
}

export type AccountAddressItemType = {
  accountName: string;
  accountProxyId: string;
  accountProxyType: AccountProxyType;
  accountType: KeypairType;
  address: string;
  accountActions?: AccountActions[]
}
