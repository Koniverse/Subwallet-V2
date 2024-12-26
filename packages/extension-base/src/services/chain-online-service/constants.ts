// Copyright 2019-2022 @subwallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainAsset, _ChainInfo } from '@subwallet/chain-list/types';
import { Md5 } from 'ts-md5';

export const LATEST_CHAIN_PATCH_FETCHING_INTERVAL = 180000;

export function md5HashChainInfo (data: _ChainInfo) { // todo: use from chain list package later
  const { chainStatus, icon, providers, ...chainBaseInfo } = data;

  return Md5.hashStr(JSON.stringify(chainBaseInfo));
}

export function md5HashChainAsset (data: _ChainAsset) { // todo: use from chain list package later
  const { icon, ...assetBaseInfo } = data;

  return Md5.hashStr(JSON.stringify(assetBaseInfo));
}
