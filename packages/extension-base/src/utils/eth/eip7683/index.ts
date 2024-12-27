// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { _ERC20_ABI } from '@subwallet/extension-base/koni/api/contract-handler/utils';
import { encodeFunctionData } from 'viem';

import { HexString } from '@polkadot/util/types';

import { BridgeAbi, UniswapV2RouterAbi } from './helper';

export const swapTokenToToken = (sourceToken: HexString, targetToken: HexString, amount: HexString, to: HexString): HexString => {
  const deadline = Date.now() + 60000;

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return encodeFunctionData({
    abi: UniswapV2RouterAbi,
    functionName: 'swapExactTokensForTokens',
    args: [
      amount,
      '0x00',
      [sourceToken, targetToken],
      to,
      `0x${deadline.toString(16)}`
    ]
  });
};

export const swapTokenToEth = (sourceToken: HexString, amount: HexString, to: HexString): HexString => {
  const deadline = Date.now() + 60000;
  const WETH = '0x582fCdAEc1D2B61c1F71FC5e3D2791B8c76E44AE';

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return encodeFunctionData({
    abi: UniswapV2RouterAbi,
    functionName: 'swapExactTokensForETH',
    args: [
      amount,
      '0x00',
      [sourceToken, WETH],
      to,
      `0x${deadline.toString(16)}`
    ]
  });
};

export const approveToken = (spender: HexString, amount: HexString): HexString => {
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return encodeFunctionData({
    abi: _ERC20_ABI,
    functionName: 'approve',
    args: [
      spender,
      amount
    ]
  });
};

export const bridgeEthTo = (address: HexString): HexString => {
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return encodeFunctionData({
    abi: BridgeAbi,
    functionName: 'bridgeETHTo',
    args: [
      address,
      `0x${BigInt(200_000).toString(16)}`,
      '0x'
    ]
  });
};
