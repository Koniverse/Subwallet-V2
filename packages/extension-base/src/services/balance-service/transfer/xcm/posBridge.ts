// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { COMMON_CHAIN_SLUGS } from '@subwallet/chain-list';
import { _ChainAsset, _ChainInfo } from '@subwallet/chain-list/types';
import { getWeb3Contract } from '@subwallet/extension-base/koni/api/contract-handler/evm/web3';
import { _POS_BRIDGE_ABI, _POS_BRIDGE_L2_ABI, getPosL1BridgeContract, getPosL2BridgeContract } from '@subwallet/extension-base/koni/api/contract-handler/utils';
import { _EvmApi } from '@subwallet/extension-base/services/chain-service/types';
import { calculateGasFeeParams } from '@subwallet/extension-base/services/fee-service/utils';
import { _NotificationInfo, ClaimPolygonBridgeNotificationMetadata } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';
import { fetchPolygonBridgeTransactions } from '@subwallet/extension-base/services/inapp-notification-service/utils';
import { BasicTxErrorType } from '@subwallet/extension-base/types';
import { TransactionConfig } from 'web3-core';
import { ContractSendMethod } from 'web3-eth-contract';

interface inputData {
  error?: string
  message: string;
  result?: string;
}

interface EventArgument {
  topics: string[];
}

interface Event {
  arguments: EventArgument[];
}

export const POS_EXIT_PAYLOAD_INDEXER = {
  MAINNET: 'https://proof-generator.polygon.technology/api/v1/matic/exit-payload',
  TESTNET: 'https://proof-generator.polygon.technology/api/v1/amoy/exit-payload'
};

export async function _createPosBridgeL1toL2Extrinsic (tokenInfo: _ChainAsset, originChainInfo: _ChainInfo, sender: string, recipientAddress: string, value: string, evmApi: _EvmApi): Promise<TransactionConfig> {
  const posBridgeContractAddress = getPosL1BridgeContract(originChainInfo.slug);
  const posBridgeContract = getWeb3Contract(posBridgeContractAddress, evmApi, _POS_BRIDGE_ABI);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
  const transferCall: ContractSendMethod = posBridgeContract.methods.depositEtherFor(recipientAddress);
  const transferEncodedCall = transferCall.encodeABI();
  const priority = await calculateGasFeeParams(evmApi, evmApi.chainSlug);

  const transactionConfig: TransactionConfig = {
    from: sender,
    to: posBridgeContractAddress,
    value: value,
    data: transferEncodedCall,
    gasPrice: priority.gasPrice,
    maxFeePerGas: priority?.maxFeePerGas?.toString(),
    maxPriorityFeePerGas: priority?.maxPriorityFeePerGas?.toString()
  };

  const gasLimit = await evmApi.api.eth.estimateGas(transactionConfig).catch(() => 200000);

  transactionConfig.gas = gasLimit.toString();

  return transactionConfig;
}

export async function _createPosBridgeL2toL1Extrinsic (tokenInfo: _ChainAsset, originChainInfo: _ChainInfo, sender: string, recipientAddress: string, value: string, evmApi: _EvmApi): Promise<TransactionConfig> {
  const posBridgeContractAddress = getPosL2BridgeContract(originChainInfo.slug);
  const posBridgeContract = getWeb3Contract(posBridgeContractAddress, evmApi, _POS_BRIDGE_L2_ABI);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
  const transferCall: ContractSendMethod = posBridgeContract.methods.withdraw(value);
  const transferEncodedCall = transferCall.encodeABI();
  const priority = await calculateGasFeeParams(evmApi, evmApi.chainSlug);

  const transactionConfig: TransactionConfig = {
    from: sender,
    to: posBridgeContractAddress,
    value: undefined,
    data: transferEncodedCall,
    gasPrice: priority.gasPrice,
    maxFeePerGas: priority?.maxFeePerGas?.toString(),
    maxPriorityFeePerGas: priority?.maxPriorityFeePerGas?.toString()
  };

  const gasLimit = await evmApi.api.eth.estimateGas(transactionConfig).catch(() => 200000);

  transactionConfig.gas = gasLimit.toString();

  return transactionConfig;
}

export async function getClaimPosBridge (chainSlug: string, notification: _NotificationInfo, evmApi: _EvmApi) {
  const posBridgeContractAddress = getPosL2BridgeContract(chainSlug);
  const posBridgeContract = getWeb3Contract(posBridgeContractAddress, evmApi, _POS_BRIDGE_L2_ABI);

  const metadata = notification.metadata as ClaimPolygonBridgeNotificationMetadata;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
  const event = posBridgeContract.events.Transfer(metadata.userAddress, metadata.userAddress, metadata.amounts[0]) as Event;

  const isTestnet = chainSlug === COMMON_CHAIN_SLUGS.ETHEREUM_SEPOLIA;
  const domain = isTestnet ? POS_EXIT_PAYLOAD_INDEXER.TESTNET : POS_EXIT_PAYLOAD_INDEXER.MAINNET;

  const eventSignature: string = event?.arguments?.[0]?.topics?.[0];

  let inputData: inputData;

  try {
    const res = await fetch(`${domain}/${metadata.transactionHash}?eventSignature=${eventSignature}`);

    inputData = await res.json() as inputData;

    if (inputData.error && inputData.message.includes('not been checkpointed yet')) {
      throw new Error(`${inputData.message}. Please try again later.`);
    }
  } catch (err) {
    console.error('Error:', err);
    throw new Error(BasicTxErrorType.INTERNAL_ERROR);
  }

  const posClaimContractAddress = getPosL1BridgeContract(chainSlug);
  const posClaimContract = getWeb3Contract(posClaimContractAddress, evmApi, _POS_BRIDGE_ABI);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
  const transferCall: ContractSendMethod = posClaimContract.methods.exit(inputData.result);
  const transferEncodedCall = transferCall.encodeABI();

  const priority = await calculateGasFeeParams(evmApi, evmApi.chainSlug);

  const transactionConfig = {
    from: metadata.userAddress,
    to: posClaimContractAddress,
    value: '0',
    data: transferEncodedCall,
    gasPrice: priority.gasPrice,
    maxFeePerGas: priority.maxFeePerGas?.toString(),
    maxPriorityFeePerGas: priority.maxPriorityFeePerGas?.toString()
  } as TransactionConfig;

  const gasLimit = await evmApi.api.eth.estimateGas(transactionConfig).catch(() => 200000);

  transactionConfig.gas = gasLimit.toString();

  return transactionConfig;
}

export async function isClaimedPosBridge (id: string, address: string, isTestnet: boolean): Promise<boolean> {
  try {
    const isClaimableBridge = await fetchPolygonBridgeTransactions(address, isTestnet);

    if (isClaimableBridge && isClaimableBridge.success) {
      const isIdClaimable = isClaimableBridge.result.some((transaction) => transaction._id === id);

      return !isIdClaimable;
    }
  } catch (err) {
    console.error('Error:', err);
  }

  return false;
}

export function _isPosChainBridge (srcChain: string, destChain: string): boolean {
  if (srcChain === 'polygon_amoy' && destChain === COMMON_CHAIN_SLUGS.ETHEREUM_SEPOLIA) {
    return true;
  } else if (srcChain === COMMON_CHAIN_SLUGS.ETHEREUM_SEPOLIA && destChain === 'polygon_amoy') {
    return true;
  } else if (srcChain === 'polygon' && destChain === COMMON_CHAIN_SLUGS.ETHEREUM) {
    return true;
  } else if (srcChain === COMMON_CHAIN_SLUGS.ETHEREUM && destChain === 'polygon') {
    return true;
  }

  return false;
}

export function _isPosChainL2Bridge (srcChain: string, destChain: string): boolean {
  if (srcChain === 'polygon_amoy' && destChain === COMMON_CHAIN_SLUGS.ETHEREUM_SEPOLIA) {
    return true;
  } else if (srcChain === 'polygon' && destChain === COMMON_CHAIN_SLUGS.ETHEREUM) {
    return true;
  }

  return false;
}
