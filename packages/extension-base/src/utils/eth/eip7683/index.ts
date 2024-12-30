// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { _ERC20_ABI } from '@subwallet/extension-base/koni/api/contract-handler/utils';
import { encodeFunctionData, PublicClient } from 'viem';

import { HexString } from '@polkadot/util/types';

import { BridgeAbi, UniswapFactoryV2Abi, UniswapPairV2Abi, UniswapRouterV2Abi } from './helper';

const keepAliveTime = 2 * 60 * 1000;

export const swapTokenToToken = (sourceToken: HexString, targetToken: HexString, to: HexString, amountIn: HexString, minOut: HexString): HexString => {
  const deadline = Date.now() + keepAliveTime;

  return encodeFunctionData({
    abi: UniswapRouterV2Abi,
    functionName: 'swapExactTokensForTokens',
    args: [
      amountIn,
      minOut,
      [sourceToken, targetToken],
      to,
      `0x${deadline.toString(16)}`
    ]
  });
};

export const estimateTokenOut = async (sourceToken: HexString, targetToken: HexString, amount: HexString, factory: HexString, client: PublicClient): Promise<HexString> => {
  const pairAddress = (await client.readContract({
    abi: UniswapFactoryV2Abi,
    address: factory,
    functionName: 'getPair',
    args: [sourceToken, targetToken]
  })) as HexString;

  const token0 = (await client.readContract({
    abi: UniswapPairV2Abi,
    address: pairAddress,
    functionName: 'token0'
  })) as HexString;

  const [reserve0, reserve1] = (await client.readContract({
    abi: UniswapPairV2Abi,
    address: pairAddress,
    functionName: 'getReserves'
  })) as [bigint, bigint, number];

  const amountIn = BigInt(amount);

  const getOut = (reserve0: bigint, reserve1: bigint, in0: bigint) => {
    return in0 * reserve1 / reserve0;
  };

  if (token0.toLowerCase() === sourceToken.toLowerCase()) {
    return `0x${getOut(reserve0, reserve1, amountIn).toString(16)}`;
  } else {
    return `0x${getOut(reserve1, reserve0, amountIn).toString(16)}`;
  }
};

export const swapTokenToEth = (sourceToken: HexString, to: HexString, amountIn: HexString, minOut: HexString): HexString => {
  const deadline = Date.now() + keepAliveTime;
  const WETH = '0x582fCdAEc1D2B61c1F71FC5e3D2791B8c76E44AE';

  return encodeFunctionData({
    abi: UniswapRouterV2Abi,
    functionName: 'swapExactTokensForETH',
    args: [
      amountIn,
      minOut,
      [sourceToken, WETH],
      to,
      `0x${deadline.toString(16)}`
    ]
  });
};

export const approveToken = (spender: HexString, amount: HexString): HexString => {
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
