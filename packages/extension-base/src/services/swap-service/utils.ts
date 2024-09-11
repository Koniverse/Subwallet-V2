// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { Asset, Assets, Chain, Chains } from '@chainflip/sdk/swap';
import { COMMON_ASSETS, COMMON_CHAIN_SLUGS } from '@subwallet/chain-list';
import { _ChainAsset } from '@subwallet/chain-list/types';
import { ChainService } from '@subwallet/extension-base/services/chain-service';
import { _EvmApi } from '@subwallet/extension-base/services/chain-service/types';
import { _getAssetDecimals, _getAssetName, _getAssetSymbol, _getContractAddressOfToken } from '@subwallet/extension-base/services/chain-service/utils';
import { SwapPair, SwapProviderId, SwapRequest } from '@subwallet/extension-base/types/swap';
import { ChainId, CurrencyAmount, Percent, QUOTER_ADDRESSES, Token, TradeType, V3_CORE_FACTORY_ADDRESSES } from '@uniswap/sdk-core';
// @ts-ignore
import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';
import { computePoolAddress, FeeAmount, Pool, Route, SwapQuoter, SwapRouter, Trade } from '@uniswap/v3-sdk';
import BigN from 'bignumber.js';
import { ethers } from 'ethers';

export const CHAIN_FLIP_TESTNET_EXPLORER = 'https://blocks-perseverance.chainflip.io';
export const CHAIN_FLIP_MAINNET_EXPLORER = 'https://scan.chainflip.io';

export const CHAIN_FLIP_SUPPORTED_MAINNET_MAPPING: Record<string, Chain> = {
  [COMMON_CHAIN_SLUGS.POLKADOT]: Chains.Polkadot,
  [COMMON_CHAIN_SLUGS.ETHEREUM]: Chains.Ethereum
};

export const CHAIN_FLIP_SUPPORTED_TESTNET_MAPPING: Record<string, Chain> = {
  [COMMON_CHAIN_SLUGS.ETHEREUM_SEPOLIA]: Chains.Ethereum,
  [COMMON_CHAIN_SLUGS.CHAINFLIP_POLKADOT]: Chains.Polkadot
};

export const CHAIN_FLIP_SUPPORTED_MAINNET_ASSET_MAPPING: Record<string, Asset> = {
  [COMMON_ASSETS.DOT]: Assets.DOT,
  [COMMON_ASSETS.ETH]: Assets.ETH,
  [COMMON_ASSETS.USDC_ETHEREUM]: Assets.USDC
};

export const CHAIN_FLIP_SUPPORTED_TESTNET_ASSET_MAPPING: Record<string, Asset> = {
  [COMMON_ASSETS.PDOT]: Assets.DOT,
  [COMMON_ASSETS.ETH_SEPOLIA]: Assets.ETH,
  [COMMON_ASSETS.USDC_SEPOLIA]: Assets.USDC
};

export const SWAP_QUOTE_TIMEOUT_MAP: Record<string, number> = { // in milliseconds
  default: 30000,
  [SwapProviderId.CHAIN_FLIP_TESTNET]: 30000,
  [SwapProviderId.CHAIN_FLIP_MAINNET]: 30000
};

export const _PROVIDER_TO_SUPPORTED_PAIR_MAP: Record<string, string[]> = {
  [SwapProviderId.HYDRADX_MAINNET]: [COMMON_CHAIN_SLUGS.HYDRADX],
  [SwapProviderId.HYDRADX_TESTNET]: [COMMON_CHAIN_SLUGS.HYDRADX_TESTNET],
  [SwapProviderId.CHAIN_FLIP_MAINNET]: [COMMON_CHAIN_SLUGS.POLKADOT, COMMON_CHAIN_SLUGS.ETHEREUM],
  [SwapProviderId.CHAIN_FLIP_TESTNET]: [COMMON_CHAIN_SLUGS.CHAINFLIP_POLKADOT, COMMON_CHAIN_SLUGS.ETHEREUM_SEPOLIA],
  [SwapProviderId.POLKADOT_ASSET_HUB]: [COMMON_CHAIN_SLUGS.POLKADOT_ASSET_HUB],
  [SwapProviderId.KUSAMA_ASSET_HUB]: [COMMON_CHAIN_SLUGS.KUSAMA_ASSET_HUB],
  [SwapProviderId.ROCOCO_ASSET_HUB]: [COMMON_CHAIN_SLUGS.ROCOCO_ASSET_HUB],
  [SwapProviderId.UNISWAP_SEPOLIA]: [COMMON_CHAIN_SLUGS.ETHEREUM_SEPOLIA, 'base_sepolia']
};

export function getSwapAlternativeAsset (swapPair: SwapPair): string | undefined {
  return swapPair?.metadata?.alternativeAsset as string;
}

export function getSwapAltToken (chainAsset: _ChainAsset): string | undefined {
  return chainAsset.metadata?.alternativeSwapAsset as string;
}

export function calculateSwapRate (fromAmount: string, toAmount: string, fromAsset: _ChainAsset, toAsset: _ChainAsset) {
  const bnFromAmount = new BigN(fromAmount);
  const bnToAmount = new BigN(toAmount);

  const decimalDiff = _getAssetDecimals(toAsset) - _getAssetDecimals(fromAsset);
  const bnRate = bnFromAmount.div(bnToAmount);

  return 1 / bnRate.times(10 ** decimalDiff).toNumber();
}

export function convertSwapRate (rate: string, fromAsset: _ChainAsset, toAsset: _ChainAsset) {
  const decimalDiff = _getAssetDecimals(toAsset) - _getAssetDecimals(fromAsset);
  const bnRate = new BigN(rate);

  return bnRate.times(10 ** decimalDiff).pow(-1).toNumber();
}

export interface UniSwapPoolInfo {
  token0: string
  token1: string
  fee: number
  sqrtPriceX96: string,
  liquidity: string,
  tick: number
}

export async function handleUniswapQuote (request: SwapRequest, web3Api: _EvmApi, chainService: ChainService): Promise<[string, string]> {
  const { from, to: _to } = request.pair;
  let to = _to;

  if (to === 'base_sepolia-ERC20-WETH-0x4200000000000000000000000000000000000006') {
    to = 'sepolia_ethereum-ERC20-WETH-0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14';
  }

  const fromToken = chainService.getAssetBySlug(from);
  const toToken = chainService.getAssetBySlug(to);
  const chainId = ChainId.SEPOLIA;

  const fromContract = _getContractAddressOfToken(fromToken);
  const toContract = _getContractAddressOfToken(toToken);

  const fromTokenStruct = new Token(
    chainId,
    fromContract,
    _getAssetDecimals(fromToken),
    _getAssetSymbol(fromToken),
    _getAssetName(fromToken)
  );

  const toTokenStruct = new Token(
    chainId,
    toContract,
    _getAssetDecimals(toToken),
    _getAssetSymbol(toToken),
    _getAssetName(toToken)
  );

  const currentPoolAddress = computePoolAddress({
    fee: FeeAmount.HIGH,
    tokenA: fromTokenStruct,
    tokenB: toTokenStruct,
    factoryAddress: V3_CORE_FACTORY_ADDRESSES[chainId as number]
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-member-access
  const poolContract = new web3Api.api.eth.Contract(IUniswapV3PoolABI.abi, currentPoolAddress);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-member-access
  // const quoterContract = new web3Api.api.eth.Contract(Quoter.abi, QUOTER_ADDRESSES[chainId as number]);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const [fee, liquidity, slot0] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
    poolContract.methods.fee().call(),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
    poolContract.methods.liquidity().call(),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
    poolContract.methods.slot0().call()
  ]);

  const provider = new ethers.JsonRpcProvider(web3Api.apiUrl);
  // const quoterContract1 = new ethers.Contract(
  //   QUOTER_ADDRESSES[chainId as number],
  //   Quoter.abi,
  //   provider
  // );
  // try {
  //   const quotedAmountOut = await quoterContract1.quoteExactInputSingle.staticCall([
  //     fromContract,
  //     toContract,
  //     fee,
  //     request.fromAmount,
  //     toContract
  //   ]);
  //
  //   console.log(quotedAmountOut);
  // } catch (e) {
  //   console.log(e);
  // }

  const poolInfo: UniSwapPoolInfo = {
    token0: fromContract,
    token1: toContract,
    fee: parseInt(fee as string),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
    sqrtPriceX96: slot0[0].toString(),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
    liquidity: liquidity.toString(),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-argument
    tick: parseInt(slot0[1])
  };

  const pool = new Pool(
    fromTokenStruct,
    toTokenStruct,
    poolInfo.fee,
    poolInfo.sqrtPriceX96.toString(),
    poolInfo.liquidity.toString(),
    poolInfo.tick
  );

  const swapRoute = new Route(
    [pool],
    fromTokenStruct,
    toTokenStruct
  );

  const { calldata } = SwapQuoter.quoteCallParameters(
    swapRoute,
    CurrencyAmount.fromRawAmount(
      fromTokenStruct,
      request.fromAmount
    ),
    TradeType.EXACT_INPUT,
    {
      useQuoterV2: true
    }
  );

  const quoteCallReturnData = await provider.call({
    to: QUOTER_ADDRESSES[chainId as number],
    data: calldata
  });

  const availQuote = web3Api.api.eth.abi.decodeParameter('uint256', quoteCallReturnData);

  const uncheckedTrade = Trade.createUncheckedTrade({
    route: swapRoute,
    inputAmount: CurrencyAmount.fromRawAmount(
      fromTokenStruct,
      request.fromAmount
    ),
    outputAmount: CurrencyAmount.fromRawAmount(
      toTokenStruct,
      availQuote.toString()
    ),
    tradeType: TradeType.EXACT_INPUT
  });

  const methodParameters = SwapRouter.swapCallParameters([uncheckedTrade], {
    slippageTolerance: new Percent(500, 10_000),
    deadline: Math.floor(Date.now() / 1000) + 60 * 20,
    recipient: request.address
  });

  return [
    availQuote.toString(),
    methodParameters.calldata
  ];
}
