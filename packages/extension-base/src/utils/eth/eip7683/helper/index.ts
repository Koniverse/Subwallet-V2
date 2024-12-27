// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { Abi } from 'viem';

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-var-requires
export const UniswapV2RouterAbi = require('./UniswapV2Router.json').abi as Abi;

export { default as BridgeAbi } from './bridge';
