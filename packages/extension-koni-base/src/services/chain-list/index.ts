// Copyright 2019-2022 @subwallet/extension-koni-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

/* eslint @typescript-eslint/no-var-requires: "off" */

import { _AssetRef, _Chain, _ChainAsset, _ChainProvider, _EvmChain, _MultiChainAsset, _SubstrateChain } from '@subwallet/extension-koni-base/services/chain-list/types';

export const Chain = require('./data/Chain.json') as Record<string, _Chain>;
export const ChainAsset = require('./data/ChainAsset.json') as Record<string, _ChainAsset>;
export const ChainProvider = require('./data/ChainProvider.json') as Record<number, _ChainProvider>;
export const EvmChain = require('./data/EvmChain.json') as Record<number, _EvmChain>;
export const SubstrateChain = require('./data/SubstrateChain.json') as Record<number, _SubstrateChain>;
export const MultiChainAsset = require('./data/MultiChainAsset.json') as Record<number, _MultiChainAsset>;
export const AssetRef = require('./data/AssetRef.json') as Record<number, _AssetRef>;
