// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { _ChainAsset, _ChainInfo } from '@subwallet/chain-list/types';
import { getWeb3Contract } from '@subwallet/extension-base/koni/api/contract-handler/evm/web3';
import { _POLYGON_BRIDGE_ABI, getPolygonBridgeContract } from '@subwallet/extension-base/koni/api/contract-handler/utils';
import { _EvmApi } from '@subwallet/extension-base/services/chain-service/types';
import { _getContractAddressOfToken } from '@subwallet/extension-base/services/chain-service/utils';
import { calculateGasFeeParams } from '@subwallet/extension-base/services/fee-service/utils';
import { TransactionConfig } from 'web3-core';
import { ContractSendMethod } from 'web3-eth-contract';

export async function _createPolygonBridgeL1toL2Extrinsic (tokenInfo: _ChainAsset, originChainInfo: _ChainInfo, sender: string, recipientAddress: string, value: string, evmApi: _EvmApi): Promise<TransactionConfig> {
  const polygonBridgeContractAddress = getPolygonBridgeContract(originChainInfo.slug);
  const polygonBridgeContract = getWeb3Contract(polygonBridgeContractAddress, evmApi, _POLYGON_BRIDGE_ABI);
  const tokenContract = _getContractAddressOfToken(tokenInfo) || '0x0000000000000000000000000000000000000000'; // FOR Ethereum: use null address
  const destinationNetwork = 1;

  if (tokenContract !== '0x0000000000000000000000000000000000000000') {
    throw new Error('Only native token transfer is supported');
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
  const transferCall: ContractSendMethod = polygonBridgeContract.methods.bridgeAsset(destinationNetwork, recipientAddress, value, tokenContract, true, '0x');
  const transferEncodedCall = transferCall.encodeABI();
  const priority = await calculateGasFeeParams(evmApi, evmApi.chainSlug);

  const transactionConfig = {
    from: sender,
    to: polygonBridgeContractAddress,
    value: value,
    data: transferEncodedCall,
    gasPrice: priority.gasPrice,
    maxFeePerGas: priority.maxFeePerGas?.toString(),
    maxPriorityFeePerGas: priority.maxPriorityFeePerGas?.toString()
  } as TransactionConfig;

  let gasLimit;

  try {
    gasLimit = await evmApi.api.eth.estimateGas(transactionConfig);
  } catch (e) {
    gasLimit = 200000; // todo: handle this better
  }

  transactionConfig.gas = gasLimit;

  return transactionConfig;
}

export function _isPolygonChainBridge (srcChain: string, destChain: string): boolean {
  if (srcChain === 'polygonzkEvm_cardona' && destChain === 'sepolia_ethereum') {
    return true;
  } else if (srcChain === 'sepolia_ethereum' && destChain === 'polygonzkEvm_cardona') {
    return true;
  } else if (srcChain === 'polygonZkEvm' && destChain === 'ethereum') {
    return true;
  } else if (srcChain === 'ethereum' && destChain === 'polygonZkEvm') {
    return true;
  }

  return false;
}
