// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { COMMON_CHAIN_SLUGS } from '@subwallet/chain-list';
import { _Address } from '@subwallet/extension-base/background/KoniTypes';
import { AbiItem } from 'web3-utils';

// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-assignment
export const _ERC20_ABI: AbiItem[] | AbiItem = require('./erc20_abi.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-assignment
export const _ERC721_ABI: AbiItem[] | AbiItem = require('./erc721_abi.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-assignment
export const _TEST_ERC721_ABI = require('./test_erc721_abi.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-assignment
export const _PSP22_ABI: Record<string, any> = require('./psp22_abi.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-assignment
export const _PSP34_ABI: Record<string, any> = require('./psp34_abi.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-assignment
export const _PINK_PSP34_ABI: Record<string, any> = require('./pink_psp34_abi.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-assignment
export const _NEUROGUNS_PSP34_ABI: Record<string, any> = require('./neuroguns_psp34_abi.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-assignment
export const _AZERO_DOMAIN_REGISTRY_ABI: Record<string, any> = require('./azero_domain_registry_abi.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-assignment
export const _SNOWBRIDGE_GATEWAY_ABI: Record<string, any> = require('./snowbridge_gateway_abi.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-assignment
export const _AVAIL_BRIDGE_GATEWAY_ABI: Record<string, any> = require('./avail_bridge_abi.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-assignment
export const _AVAIL_TEST_BRIDGE_GATEWAY_ABI: Record<string, any> = require('./avail_test_bridge_abi.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-assignment
export const _POLYGON_BRIDGE_ABI: Record<string, any> = require('./polygon_bridge_abi.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-assignment
export const _POS_BRIDGE_ABI: Record<string, any> = require('./pos_bridge_abi.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-assignment
export const _POS_BRIDGE_L2_ABI: Record<string, any> = require('./pos_bridge_l2_abi.json');

const SNOWBRIDGE_GATEWAY_ETHEREUM_CONTRACT_ADDRESS = '0x27ca963C279c93801941e1eB8799c23f407d68e7';
const SNOWBRIDGE_GATEWAY_SEPOLIA_CONTRACT_ADDRESS = '0x5B4909cE6Ca82d2CE23BD46738953c7959E710Cd';

export function getSnowBridgeGatewayContract (chain: string) {
  if (chain === COMMON_CHAIN_SLUGS.ETHEREUM_SEPOLIA) {
    return SNOWBRIDGE_GATEWAY_SEPOLIA_CONTRACT_ADDRESS;
  }

  return SNOWBRIDGE_GATEWAY_ETHEREUM_CONTRACT_ADDRESS;
}

export function isSnowBridgeGatewayContract (contractAddress: _Address) {
  return [SNOWBRIDGE_GATEWAY_ETHEREUM_CONTRACT_ADDRESS, SNOWBRIDGE_GATEWAY_SEPOLIA_CONTRACT_ADDRESS].includes(contractAddress);
}

const AVAILBRIDGE_GATEWAY_ETHEREUM_CONTRACT_ADDRESS = '0x054fd961708D8E2B9c10a63F6157c74458889F0a';
const AVAILBRIDGE_GATEWAY_SEPOLIA_CONTRACT_ADDRESS = '0x967F7DdC4ec508462231849AE81eeaa68Ad01389';

export function getAvailBridgeGatewayContract (chain: string) {
  if (chain === COMMON_CHAIN_SLUGS.ETHEREUM_SEPOLIA) {
    return AVAILBRIDGE_GATEWAY_SEPOLIA_CONTRACT_ADDRESS;
  }

  return AVAILBRIDGE_GATEWAY_ETHEREUM_CONTRACT_ADDRESS;
}

export function isAvailBridgeGatewayContract (contractAddress: _Address) {
  return [AVAILBRIDGE_GATEWAY_ETHEREUM_CONTRACT_ADDRESS, AVAILBRIDGE_GATEWAY_SEPOLIA_CONTRACT_ADDRESS].includes(contractAddress);
}

const POLYGONBRIDGE_GATEWAY_ETHEREUM_CONTRACT_ADDRESS = '0x2a3DD3EB832aF982ec71669E178424b10Dca2EDe';
const POLYGONBRIDGE_GATEWAY_SEPOLIA_CONTRACT_ADDRESS = '0x528e26b25a34a4A5d0dbDa1d57D318153d2ED582';

export function getPolygonBridgeContract (chain: string): string {
  if (chain === 'polygonzkEvm_cardona' || chain === COMMON_CHAIN_SLUGS.ETHEREUM_SEPOLIA) {
    return POLYGONBRIDGE_GATEWAY_SEPOLIA_CONTRACT_ADDRESS;
  } else if (chain === 'polygonZkEvm' || chain === COMMON_CHAIN_SLUGS.ETHEREUM) {
    return POLYGONBRIDGE_GATEWAY_ETHEREUM_CONTRACT_ADDRESS;
  }

  throw new Error('Invalid chain');
}

const POSBRIDGE_GATEWAY_AMOY_CONTRACT_ADDRESS = '0x52eF3d68BaB452a294342DC3e5f464d7f610f72E';
const POSBRIDGE_GATEWAY_SEPOLIA_CONTRACT_ADDRESS = '0x34F5A25B627f50Bb3f5cAb72807c4D4F405a9232';

const POSBRIDGE_GATEWAY_CONTRACT_ADDRESS = '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619';
const POSBRIDGE_GATEWAY_ETHEREUM_CONTRACT_ADDRESS = '0xA0c68C638235ee32657e8f720a23ceC1bFc77C77';

export function getPosL2BridgeContract (chain: string): string {
  if (chain === 'polygon_amoy' || chain === COMMON_CHAIN_SLUGS.ETHEREUM_SEPOLIA) {
    return POSBRIDGE_GATEWAY_AMOY_CONTRACT_ADDRESS;
  } else if (chain === 'polygon' || chain === COMMON_CHAIN_SLUGS.ETHEREUM) {
    return POSBRIDGE_GATEWAY_CONTRACT_ADDRESS;
  }

  throw new Error('Invalid chain');
}

export function getPosL1BridgeContract (chain: string): string {
  if (chain === COMMON_CHAIN_SLUGS.ETHEREUM_SEPOLIA) {
    return POSBRIDGE_GATEWAY_SEPOLIA_CONTRACT_ADDRESS;
  } else if (chain === COMMON_CHAIN_SLUGS.ETHEREUM) {
    return POSBRIDGE_GATEWAY_ETHEREUM_CONTRACT_ADDRESS;
  }

  throw new Error('Invalid chain');
}
