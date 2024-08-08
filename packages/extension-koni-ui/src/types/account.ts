// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { KeypairType } from '@subwallet/keyring/types';

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

export type AccountNetworkAddress = {
  name: string;
  slug: string;
  address: string;
}

export type AccountAddressItemType = {
  accountName: string;
  accountProxyId: string;
  accountType: KeypairType;
  address: string;
}
