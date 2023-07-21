// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _AssetRefPath, _AssetType } from '@subwallet/chain-list/types';

export type ChainInfo = {
  slug: string;
  name: string;
}

export interface ChainItemType {
  name: string;
  slug: string;
  type?: _AssetRefPath;
}

export interface TokenTypeItem {
  label: string;
  value: _AssetType;
}
