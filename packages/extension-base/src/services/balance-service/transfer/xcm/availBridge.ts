// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { COMMON_CHAIN_SLUGS } from '@subwallet/chain-list';
import { _ChainInfo } from '@subwallet/chain-list/types';
import { getWeb3Contract } from '@subwallet/extension-base/koni/api/contract-handler/evm/web3';
import { _AVAIL_BRIDGE_GATEWAY_ABI, _AVAIL_TEST_BRIDGE_GATEWAY_ABI, getAvailBridgeGatewayContract } from '@subwallet/extension-base/koni/api/contract-handler/utils';
import { _EvmApi, _SubstrateApi } from '@subwallet/extension-base/services/chain-service/types';
import { calculateGasFeeParams } from '@subwallet/extension-base/services/fee-service/utils';
import { _NotificationInfo, ClaimAvailBridgeNotificationMetadata } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';
import { AVAIL_BRIDGE_API } from '@subwallet/extension-base/services/inapp-notification-service/utils';
import { decodeAddress } from '@subwallet/keyring';
import { PrefixedHexString } from 'ethereumjs-util';
import { TransactionConfig } from 'web3-core';
import { ContractSendMethod } from 'web3-eth-contract';

import { u8aToHex } from '@polkadot/util';

export const AvailBridgeConfig = {
  ASSET_ID: '0x0000000000000000000000000000000000000000000000000000000000000000',
  ETHEREUM_DOMAIN: 2, // todo: check if these config can change later
  AVAIL_DOMAIN: 1
};

export interface merkleProof {
  blobRoot: string;
  blockHash: string;
  bridgeRoot: string;
  dataRoot: string;
  dataRootCommitment: string;
  dataRootIndex: number;
  dataRootProof: DataRootProof;
  leaf: string;
  leafIndex: number;
  leafProof: LeafProof;
  message: Message;
  rangeHash: string;
}

type DataRootProof = `0x${string}`[];
type LeafProof = `0x${string}`[];
type Message = {
  destinationDomain: number;
  from: string;
  id: number;
  message: {
    fungibleToken: {
      amount: bigint;
      asset_id: `0x${string}`;
    };
  };
  originDomain: number;
  to: string;
  messageType: string;
};

export async function getAvailBridgeTxFromEth (originChainInfo: _ChainInfo, sender: string, recipient: string, value: string, evmApi: _EvmApi): Promise<TransactionConfig> {
  const availBridgeContractAddress = getAvailBridgeGatewayContract(originChainInfo.slug);
  const ABI = getAvailBridgeAbi(originChainInfo.slug);
  const availBridgeContract = getWeb3Contract(availBridgeContractAddress, evmApi, ABI);
  const _address = u8aToHex(decodeAddress(recipient));
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
  const sendAvail = availBridgeContract.methods.sendAVAIL(_address, value) as ContractSendMethod;
  const transferData = sendAvail.encodeABI();
  const priority = await calculateGasFeeParams(evmApi, evmApi.chainSlug);
  const gasLimit = await sendAvail.estimateGas({ from: sender });

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
    domain: AvailBridgeConfig.ETHEREUM_DOMAIN
  };

  const chainApi = await substrateApi.isReady;

  return chainApi.api.tx.vector.sendMessage(data.message, data.to, data.domain);
}

export async function getClaimTxOnAvail (notification: _NotificationInfo, substrateApi: _SubstrateApi) {
  const chainApi = await substrateApi.isReady;
  const chainSlug = chainApi.chainSlug;
  const metadata = notification.metadata as ClaimAvailBridgeNotificationMetadata;
  const lastestEthHeadSlot = await getLastestEthHeadSlot(chainSlug);
  const lastestBlockHash = await getLastestBlockHash(chainSlug, lastestEthHeadSlot);
  const proof = await getClaimProofOnAvail(chainSlug, lastestBlockHash, metadata.messageId);

  return chainApi.api.tx.vector.execute(
    lastestEthHeadSlot,
    getAddressMessage(notification),
    proof.accountProof,
    proof.storageProof
  );
}

async function getLastestEthHeadSlot (chainSlug: string) {
  try {
    const api = getAvailBridgeApi(chainSlug);
    const rawResponse = await fetch(`${api}/eth/head`);
    const response = await rawResponse.json() as { slot: number, timestamp: number, timestampDiff: number };

    return response.slot;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

async function getLastestBlockHash (chainSlug: string, slot: number) {
  try {
    const api = getAvailBridgeApi(chainSlug);
    const rawResponse = await fetch(`${api}/beacon/slot/${slot}`);
    const response = await rawResponse.json() as { blockHash: string, blockNumber: number };

    return response.blockHash;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

async function getClaimProofOnAvail (chainSlug: string, blockHash: string, messageId: string) {
  try {
    const api = getAvailBridgeApi(chainSlug);
    const rawResponse = await fetch(`${api}/avl/proof/${blockHash}/${messageId}`);

    return await rawResponse.json() as { accountProof: PrefixedHexString[], storageProof: PrefixedHexString[] };
  } catch (e) {
    console.error(e);
    throw e;
  }
}

async function getClaimProofOnEthereum (chainSlug: string, blockHash: string, transactionIndex: string) {
  try {
    const api = getAvailBridgeApi(chainSlug);
    const rawResponse = await fetch(`${api}/eth/proof/${blockHash}?index=${transactionIndex}`);

    return await rawResponse.json() as merkleProof;
  } catch (e) {
    console.error(e);
    throw e;
  }
}

function getAvailBridgeApi (chainSlug: string) {
  if (chainSlug === 'avail_mainnet' || chainSlug === COMMON_CHAIN_SLUGS.ETHEREUM) { // todo: add COMMON_CHAIN_SLUGS for AVAIL, AVAIL TURING
    return AVAIL_BRIDGE_API.AVAIL_MAINNET;
  }

  return AVAIL_BRIDGE_API.AVAIL_TESTNET;
}

export async function getClaimTxOnEthereum (chainSlug: string, notification: _NotificationInfo, evmApi: _EvmApi) {
  const availBridgeContractAddress = getAvailBridgeGatewayContract(chainSlug);
  const ABI = getAvailBridgeAbi(chainSlug);
  const availBridgeContract = getWeb3Contract(availBridgeContractAddress, evmApi, ABI);
  const metadata = notification.metadata as ClaimAvailBridgeNotificationMetadata;
  const merkleProof = await getClaimProofOnEthereum(chainSlug, metadata.sourceBlockHash, metadata.sourceTransactionIndex);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
  const transfer = availBridgeContract.methods.receiveAVAIL(
    {
      messageType: '0x02',
      from: merkleProof.message.from,
      to: merkleProof.message.to,
      originDomain: merkleProof.message.originDomain,
      destinationDomain: merkleProof.message.destinationDomain,
      data: evmApi.api.eth.abi.encodeParameters(
        [
          {
            name: 'assetId',
            type: 'bytes32'
          },
          {
            name: 'amount',
            type: 'uint256'
          }
        ],
        [
          merkleProof.message.message.fungibleToken.asset_id,
          BigInt(merkleProof.message.message.fungibleToken.amount)
        ]
      ),
      messageId: merkleProof.message.id
    },
    {
      dataRootProof: merkleProof.dataRootProof,
      leafProof: merkleProof.leafProof,
      rangeHash: merkleProof.rangeHash,
      dataRootIndex: merkleProof.dataRootIndex,
      blobRoot: merkleProof.blobRoot,
      bridgeRoot: merkleProof.bridgeRoot,
      leaf: merkleProof.leaf,
      leafIndex: merkleProof.leafIndex
    }
  ) as ContractSendMethod;
  const transferData = transfer.encodeABI();
  const gasLimit = await transfer.estimateGas({ from: metadata.receiverAddress });
  const priority = await calculateGasFeeParams(evmApi, evmApi.chainSlug);

  return {
    from: metadata.receiverAddress,
    to: availBridgeContractAddress,
    value: '0',
    data: transferData,
    gasPrice: priority.gasPrice,
    maxFeePerGas: priority.maxFeePerGas?.toString(),
    maxPriorityFeePerGas: priority.maxPriorityFeePerGas?.toString(),
    gas: gasLimit
  } as TransactionConfig;
}

function getAddressMessage (notification: _NotificationInfo) {
  const metadata = notification.metadata as ClaimAvailBridgeNotificationMetadata;

  return {
    message: {
      FungibleToken: {
        assetId: AvailBridgeConfig.ASSET_ID,
        amount: metadata.amount
      }
    },
    from: `${metadata.depositorAddress.padEnd(66, '0')}`,
    to: u8aToHex(decodeAddress(metadata.receiverAddress)),
    originDomain: AvailBridgeConfig.ETHEREUM_DOMAIN,
    destinationDomain: AvailBridgeConfig.AVAIL_DOMAIN,
    id: metadata.messageId
  };
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
