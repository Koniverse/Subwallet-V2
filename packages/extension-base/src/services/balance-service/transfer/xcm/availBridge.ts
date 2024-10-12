// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { COMMON_CHAIN_SLUGS } from '@subwallet/chain-list';
import { _ChainAsset, _ChainInfo } from '@subwallet/chain-list/types';
import { getWeb3Contract } from '@subwallet/extension-base/koni/api/contract-handler/evm/web3';
import { _AVAIL_BRIDGE_GATEWAY_ABI, _AVAIL_TEST_BRIDGE_GATEWAY_ABI, getAvailBridgeGatewayContract } from '@subwallet/extension-base/koni/api/contract-handler/utils';
import { _EvmApi, _SubstrateApi } from '@subwallet/extension-base/services/chain-service/types';
import { calculateGasFeeParams } from '@subwallet/extension-base/services/fee-service/utils';
import { decodeAddress } from '@subwallet/keyring';
import { TransactionConfig } from 'web3-core';

import { u8aToHex } from '@polkadot/util';

export const AvailBridgeConfig = {
  ASSET_ID: '0x0000000000000000000000000000000000000000000000000000000000000000',
  ETH_DOMAIN: 1,
  AVAIL_DOMAIN: 2
};

export async function getAvailBridgeTxFromEth (tokenInfo: _ChainAsset, originChainInfo: _ChainInfo, destinationChainInfo: _ChainInfo, sender: string, recipient: string, value: string, evmApi: _EvmApi): Promise<TransactionConfig> {
  const availBridgeContractAddress = getAvailBridgeGatewayContract(originChainInfo.slug);
  const ABI = getAvailBridgeAbi(originChainInfo.slug);
  const availBridgeContract = getWeb3Contract(availBridgeContractAddress, evmApi, ABI);
  const transferData = availBridgeContract.methods.sendAVAIL(u8aToHex(decodeAddress(recipient)), value).encodeABI() as string;
  const priority = await calculateGasFeeParams(evmApi, evmApi.chainSlug);
  const gasLimit = await availBridgeContract.methods.sendAVAIL(u8aToHex(decodeAddress(recipient)), value).estimateGas({ from: sender }) as number;

  return {
    from: sender,
    to: availBridgeContractAddress,
    value: '0',
    data: transferData,
    gasPrice: priority.gasPrice,
    maxFeePerGas: priority.maxFeePerGas?.toString(),
    maxPriorityFeePerGas: priority.maxPriorityFeePerGas?.toString(),
    gas: gasLimit
  } as TransactionConfig;
}

export async function getAvailBridgeExtrinsicFromAvail (recipient: string, sendingValue: string, substrateApi: _SubstrateApi) {
  const data = {
    message: {
      FungibleToken: {
        assetId: AvailBridgeConfig.ASSET_ID,
        amount: BigInt(sendingValue)
      }
    },
    to: `${recipient.padEnd(66, '0')}`,
    domain: AvailBridgeConfig.AVAIL_DOMAIN
  };

  const chainApi = await substrateApi.isReady;
  const api = chainApi.api;

  return api.tx.vector.sendMessage(data.message, data.to, data.domain);
}

function getAvailBridgeAbi (chainSlug: string) {
  if (chainSlug === COMMON_CHAIN_SLUGS.ETHEREUM_SEPOLIA) {
    return _AVAIL_TEST_BRIDGE_GATEWAY_ABI;
  }

  return _AVAIL_BRIDGE_GATEWAY_ABI;
}

export function isAvailChainBridge (chainSlug: string) {
  return ['avail_mainnet', 'availTuringTest'].includes(chainSlug);
}
