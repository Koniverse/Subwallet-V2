// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

export { default as kernelAbi } from './kernelV3Implementation';

// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-assignment
export const SafeAbi: Record<string, any> = require('./Safe.json').abi;
// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-assignment
export const SafeEIP7702ProxyAbi: Record<string, any> = require('./SafeEIP7702Proxy.json').abi;
// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-assignment
export const SafeEIP7702ProxyFactoryAbi: Record<string, any> = require('./SafeEIP7702ProxyFactory.json').abi;
// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-assignment
export const SafeModuleSetupAbi: Record<string, any> = require('./SafeModuleSetup.json').abi;
