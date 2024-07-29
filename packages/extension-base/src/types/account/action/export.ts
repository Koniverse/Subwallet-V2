// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

export interface RequestExportAccountProxyMnemonic {
  proxyId: string;
  password: string;
}

export interface ResponseExportAccountProxyMnemonic {
  result: string;
}
