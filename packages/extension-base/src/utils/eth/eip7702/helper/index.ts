// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { HexString } from '@polkadot/util/types';
import { Abi } from 'viem';

export { default as kernelAbi } from './kernelV3Implementation';

// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
export const SafeAbi = require('./Safe.json').abi as Abi;
// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
export const SafeEIP7702ProxyAbi = require('./SafeEIP7702Proxy.json').abi as Abi;
// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
export const SafeEIP7702ProxyFactoryAbi = require('./SafeEIP7702ProxyFactory.json').abi as Abi;
// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
export const SafeModuleSetupAbi = require('./SafeModuleSetup.json').abi as Abi;
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-var-requires
export const safeEIP7702ProxyByteCode = require('./SafeEIP7702Proxy.json').bytecode as HexString;
