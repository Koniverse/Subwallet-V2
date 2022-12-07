// Copyright 2019-2022 @subwallet/extension-koni-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

/* eslint @typescript-eslint/no-empty-interface: "off" */

import { _AssetRef, _Chain, _ChainAsset, _ChainProvider, _EvmChain, _MultiChainAsset, _SubstrateChain } from '@subwallet/extension-koni-base/services/chain-list/types';

export interface _ChainWrapper extends _Chain {
  active: boolean,
  currentProvider_: number
}

export interface _ChainProviderWrapper extends _ChainProvider {
  isCustom: boolean
}

export interface _ChainAssetWrapper extends _ChainAsset {
  isCustom: boolean
}

export interface _EvmChainWrapper extends _EvmChain {}

export interface _SubstrateChainWrapper extends _SubstrateChain {}

export interface _AssetRefWrapper extends _AssetRef {}

export interface _MultiChainAssetWrapper extends _MultiChainAsset {}

export interface _DataMap {
  chain: Record<string, _ChainWrapper>,
  chainAsset: Record<string, _ChainAssetWrapper>,
  chainProvider: Record<number, _ChainProviderWrapper>,
  multiChainAsset: Record<number, _MultiChainAssetWrapper>,
  assetRef: Record<number, _AssetRefWrapper>,
  evmChain: Record<number, _EvmChainWrapper>,
  substrateChain: Record<number, _SubstrateChainWrapper>
}

export interface _ChainInfo extends _Chain {
  substrateInfo?: _SubstrateChain,
  evmInfo?: _EvmChain
}

export interface ChainState {
  active: boolean,
  currentProvider_: number
}
