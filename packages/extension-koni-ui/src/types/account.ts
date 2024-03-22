// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { KeypairType } from '@subwallet/keyring/types';

export interface NewSeedPhraseState {
  accountTypes: KeypairType[];
}

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
  LEDGER = 'ledger',
  READ_ONLY = 'readonly',
  ALL_ACCOUNT = 'all',
  INJECTED = 'injected',
  UNKNOWN = 'unknown'
}
