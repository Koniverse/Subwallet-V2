// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { KeyringPairs$JsonV2 } from '../info';

export interface RequestExportAccountProxyMnemonic {
  proxyId: string;
  password: string;
}

export interface ResponseExportAccountProxyMnemonic {
  result: string;
}

export interface RequestAccountBatchExportV2 {
  password: string;
  proxyIds?: string[];
}

export interface ResponseAccountBatchExportV2 {
  exportedJson: KeyringPairs$JsonV2;
}
