// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { Abi } from 'viem';

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires
export const UniswapFactoryV2Abi = require('./UniswapFactoryV2.json').abi as Abi;
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires
export const UniswapPairV2Abi = require('./UniswapPairV2.json').abi as Abi;
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires
export const UniswapRouterV2Abi = require('./UniswapRouterV2.json').abi as Abi;

export { default as BridgeAbi } from './bridge';
