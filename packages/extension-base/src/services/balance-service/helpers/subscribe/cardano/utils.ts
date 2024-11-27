// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { _ChainAsset } from '@subwallet/chain-list/types';

export function getCardanoAssetId (chainAsset: _ChainAsset): string {
  return chainAsset.metadata?.policyId as string;
}
