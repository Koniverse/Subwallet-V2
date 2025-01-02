// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { createPublicClient, encodeFunctionData, encodePacked, getContractAddress, http, keccak256, parseAbi, toBytes, toHex, zeroHash } from 'viem';

import { HexString } from '@polkadot/util/types';

import { SafeEIP7702ProxyAbi, safeEIP7702ProxyByteCode, SafeEIP7702ProxyFactoryAbi, SafeModuleSetupAbi } from './helper';

const proxyFactory = '0xE60EcE6588DCcFb7373538034963B4D20a280DB0';
const safeSingleton = '0xCfaA26AD40bFC7E3b1642E1888620FC402b95dAB';
const fallbackHandler = '0x75cf11467937ce3F2f357CE24ffc3DBF8fD5c226';
const moduleSetup = '0x2204DcA7d254897ae6d815D2189032db87F50Bba';
const multiSend = '0xd58De9D288831482346fA36e6bdc16925d9cFC85';
const multiSendCallOnly = '0x4873593fC8e788eFc06287327749fdDe08C0146b';

const MultiSendABI = parseAbi(['function multiSend(bytes transactions) public payable']);

// TODO: Remove unused exports
export const unused = {
  multiSend,
  multiSendCallOnly
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

export const createSafe7702InitData = (account: string): HexString => {
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

interface MetaTransaction {
  to: HexString;
  value: bigint;
  data: HexString;
  operation: number;
}

const encodeMetaTransaction = (tx: MetaTransaction): string => {
  const data = toBytes(tx.data);
  const encoded = encodePacked(
    ['uint8', 'address', 'uint256', 'uint256', 'bytes'],
    [tx.operation, tx.to, tx.value, BigInt(data.length), tx.data]
  );

  return encoded.slice(2);
};

const encodeMultiSend = (txs: MetaTransaction[]): `0x${string}` => {
  return '0x' + txs.map((tx) => encodeMetaTransaction(tx)).join('') as `0x${string}`;
};

export const createSafe7702CallData = async (from: HexString, proxyAddress: HexString, initData: HexString, rpcUrl: string): Promise<[HexString, HexString]> => {
  const transactions: MetaTransaction[] = [];

  const transport = http(rpcUrl);

  const publicClient = createPublicClient({
    transport
  });

  if (initData) {
    const proxyCalldata = encodeFunctionData({
      abi: SafeEIP7702ProxyFactoryAbi,
      functionName: 'createProxyWithNonce',
      args: [safeSingleton, initData, BigInt(0)]
    });

    // Check if proxy is already deployed
    if (await publicClient.getCode({ address: proxyAddress })) {
      console.log(`Proxy already deployed [${proxyAddress}]`);
    } else {
      console.log(`Adding transaction to deploy proxy [${proxyAddress}]`);
      // Transaction to deploy proxy with initData
      transactions.push({
        to: proxyFactory, // to: proxy factory address
        value: BigInt(0), // value: 0
        data: proxyCalldata, // data: initData
        operation: 0
      });
    }
  }

  // Check if EOA is already initialized
  const slotZero = await publicClient.getStorageAt({ address: from, slot: toHex(0) });

  if (slotZero === zeroHash) {
    // Transaction to initialize EOA
    transactions.push({
      to: from, // to: EOA address
      value: BigInt(0), // value: 0
      data: initData, // data: Init data
      operation: 0
    });
    console.log(`Added transaction to initialize EOA [${from}]`);
  } else {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    console.log(`EOA [${from}] already initialized. Slot 0: [${slotZero}]`);
  }

  if (transactions.length > 0) {
    // Encode all transactions into a single byte string for multiSend
    const encodedTransactions = encodeMultiSend(transactions);

    const data = encodeFunctionData({ abi: MultiSendABI, functionName: 'multiSend', args: [encodedTransactions] });

    return [multiSendCallOnly, data];
  } else {
    return [from, '0x'];
  }
};
