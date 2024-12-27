// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { concat, encodeFunctionData, zeroAddress } from 'viem';

import { HexString } from '@polkadot/util/types';

const MULTI_CHAIN_VALIDATOR_ADDRESS = '0x02d32f9c668c92a60b44825c4f79b501c0f685da';

export const createKernelInitDataEIP7702 = (account: string): HexString => {
  return '0x';

  return encodeFunctionData({
    abi: [
      {
        inputs: [
          {
            internalType: 'ValidationId',
            name: '_rootValidator',
            type: 'bytes21'
          },
          {
            internalType: 'contract IHook',
            name: 'hook',
            type: 'address'
          },
          {
            internalType: 'bytes',
            name: 'validatorData',
            type: 'bytes'
          },
          {
            internalType: 'bytes',
            name: 'hookData',
            type: 'bytes'
          },
          {
            internalType: 'bytes[]',
            name: 'initConfig',
            type: 'bytes[]'
          }
        ],
        name: 'initialize',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function'
      }
    ],
    functionName: 'initialize',
    args: [
      concat(['0x01', MULTI_CHAIN_VALIDATOR_ADDRESS]),
      zeroAddress,
      account as HexString,
      '0x',
      []
    ]
  });
};
