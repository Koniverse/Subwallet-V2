// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { encodeFunctionData, encodePacked, getContractAddress, keccak256 } from 'viem';

import { HexString } from '@polkadot/util/types';

import { SafeEIP7702ProxyAbi, safeEIP7702ProxyByteCode, SafeModuleSetupAbi } from './helper';

const proxyFactory = '0xE60EcE6588DCcFb7373538034963B4D20a280DB0';
const safeSingleton = '0xCfaA26AD40bFC7E3b1642E1888620FC402b95dAB';
const fallbackHandler = '0x75cf11467937ce3F2f357CE24ffc3DBF8fD5c226';
const moduleSetup = '0x2204DcA7d254897ae6d815D2189032db87F50Bba';
const multiSend = '0xd58De9D288831482346fA36e6bdc16925d9cFC85';
const multiSendCallOnly = '0x4873593fC8e788eFc06287327749fdDe08C0146b';

// TODO: Remove unused exports
export const unused = {
  multiSend,
  multiSendCallOnly,
  proxyFactory,
  safeSingleton
};

export const getSafeProxyAddress = (
  inititalizer: `0x${string}`,
  proxyCreationCode?: `0x${string}`
) => {
  const salt = keccak256(encodePacked(['bytes32', 'uint256'], [keccak256(encodePacked(['bytes'], [inititalizer])), 0n]));

  if (!proxyCreationCode) {
    proxyCreationCode = safeEIP7702ProxyByteCode;
  }

  const deploymentCode = encodePacked(['bytes', 'uint256', 'uint256'], [proxyCreationCode || '0x', keccak256(inititalizer) as any, safeSingleton as any]);

  return getContractAddress({
    bytecode: deploymentCode,
    from: proxyFactory,
    opcode: 'CREATE2',
    salt: salt
  });
};

export const createSafeInitDataEIP7702 = (account: string): HexString => {
  const moduleSetupData: HexString = encodeFunctionData({
    abi: SafeModuleSetupAbi,
    functionName: 'enableModules',
    args: [[fallbackHandler]]
  });

  const owners = [account];
  const threshold = 1;

  return encodeFunctionData({
    abi: SafeEIP7702ProxyAbi,
    functionName: 'setup',
    args: [
      owners,
      threshold,
      moduleSetup,
      moduleSetupData,
      fallbackHandler,
      '0x' + '00'.repeat(20),
      0,
      '0x' + '00'.repeat(20)
    ]
  });
};
