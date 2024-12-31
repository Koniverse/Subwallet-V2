// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { Asset, Assets, Chain, Chains } from '@chainflip/sdk/swap';
import { COMMON_ASSETS, COMMON_CHAIN_SLUGS } from '@subwallet/chain-list';
import { _ChainAsset } from '@subwallet/chain-list/types';
import { _getAssetDecimals } from '@subwallet/extension-base/services/chain-service/utils';
import { CHAINFLIP_BROKER_API } from '@subwallet/extension-base/services/swap-service/handler/chainflip-handler';
import { SwapPair, SwapProviderId } from '@subwallet/extension-base/types/swap';
import BigN from 'bignumber.js';

export const CHAIN_FLIP_TESTNET_EXPLORER = 'https://blocks-perseverance.chainflip.io';
export const CHAIN_FLIP_MAINNET_EXPLORER = 'https://scan.chainflip.io';

export const TRANSAK_TEST_MODE = process.env.TRANSAK_TEST_MODE !== undefined ? !!process.env.TRANSAK_TEST_MODE : true;
export const TRANSAK_URL = TRANSAK_TEST_MODE ? 'https://global-stg.transak.com' : 'https://global.transak.com';

export const SIMPLE_SWAP_EXPLORER = 'https://simpleswap.io';

export const CHAIN_FLIP_SUPPORTED_MAINNET_MAPPING: Record<string, Chain> = {
  [COMMON_CHAIN_SLUGS.POLKADOT]: Chains.Polkadot,
  [COMMON_CHAIN_SLUGS.ETHEREUM]: Chains.Ethereum,
  [COMMON_CHAIN_SLUGS.ARBITRUM]: Chains.Arbitrum
};

export const CHAIN_FLIP_SUPPORTED_TESTNET_MAPPING: Record<string, Chain> = {
  [COMMON_CHAIN_SLUGS.ETHEREUM_SEPOLIA]: Chains.Ethereum,
  [COMMON_CHAIN_SLUGS.CHAINFLIP_POLKADOT]: Chains.Polkadot
};

export const CHAIN_FLIP_SUPPORTED_MAINNET_ASSET_MAPPING: Record<string, Asset> = {
  [COMMON_ASSETS.DOT]: Assets.DOT,
  [COMMON_ASSETS.ETH]: Assets.ETH,
  [COMMON_ASSETS.USDC_ETHEREUM]: Assets.USDC,
  [COMMON_ASSETS.USDT_ETHEREUM]: Assets.USDT
};

export const CHAIN_FLIP_SUPPORTED_TESTNET_ASSET_MAPPING: Record<string, Asset> = {
  [COMMON_ASSETS.PDOT]: Assets.DOT,
  [COMMON_ASSETS.ETH_SEPOLIA]: Assets.ETH,
  [COMMON_ASSETS.USDC_SEPOLIA]: Assets.USDC
};

export const SIMPLE_SWAP_SUPPORTED_TESTNET_ASSET_MAPPING: Record<string, string> = {
  'bittensor-NATIVE-TAO': 'tao',
  [COMMON_ASSETS.ETH]: 'eth',
  [COMMON_ASSETS.DOT]: 'dot',
  [COMMON_ASSETS.USDC_ETHEREUM]: 'usdc',
  [COMMON_ASSETS.USDT_ETHEREUM]: 'usdterc20'
};

export const SWAP_QUOTE_TIMEOUT_MAP: Record<string, number> = { // in milliseconds
  default: 30000,
  [SwapProviderId.CHAIN_FLIP_TESTNET]: 30000,
  [SwapProviderId.CHAIN_FLIP_MAINNET]: 30000
};

export const _PROVIDER_TO_SUPPORTED_PAIR_MAP: Record<string, string[]> = {
  [SwapProviderId.HYDRADX_MAINNET]: [COMMON_CHAIN_SLUGS.HYDRADX],
  [SwapProviderId.HYDRADX_TESTNET]: [COMMON_CHAIN_SLUGS.HYDRADX_TESTNET],
  [SwapProviderId.CHAIN_FLIP_MAINNET]: [COMMON_CHAIN_SLUGS.POLKADOT, COMMON_CHAIN_SLUGS.ETHEREUM, COMMON_CHAIN_SLUGS.ARBITRUM],
  [SwapProviderId.CHAIN_FLIP_TESTNET]: [COMMON_CHAIN_SLUGS.CHAINFLIP_POLKADOT, COMMON_CHAIN_SLUGS.ETHEREUM_SEPOLIA],
  [SwapProviderId.POLKADOT_ASSET_HUB]: [COMMON_CHAIN_SLUGS.POLKADOT_ASSET_HUB],
  [SwapProviderId.KUSAMA_ASSET_HUB]: [COMMON_CHAIN_SLUGS.KUSAMA_ASSET_HUB],
  [SwapProviderId.ROCOCO_ASSET_HUB]: [COMMON_CHAIN_SLUGS.ROCOCO_ASSET_HUB],
  [SwapProviderId.SIMPLE_SWAP]: ['bittensor', COMMON_CHAIN_SLUGS.ETHEREUM, COMMON_CHAIN_SLUGS.POLKADOT]
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

export function getChainflipOptions (isTestnet: boolean) {
  if (isTestnet) {
    return {
      network: getChainflipNetwork(isTestnet)
    };
  }

  return {
    network: getChainflipNetwork(isTestnet),
    broker: getChainflipBroker(isTestnet)
  };
}

function getChainflipNetwork (isTestnet: boolean) {
  return isTestnet ? 'perseverance' : 'mainnet';
}

export function getChainflipBroker (isTestnet: boolean) { // noted: currently not use testnet broker
  if (isTestnet) {
    return {
      url: `https://perseverance.chainflip-broker.io/rpc/${CHAINFLIP_BROKER_API}`
    };
  } else {
    return {
      url: `https://chainflip-broker.io/rpc/${CHAINFLIP_BROKER_API}`
    };
  }
}
