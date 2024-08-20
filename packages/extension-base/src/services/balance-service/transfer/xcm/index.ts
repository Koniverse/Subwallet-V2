// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { _ChainAsset, _ChainInfo } from '@subwallet/chain-list/types';
import { _isSnowBridgeXcm } from '@subwallet/extension-base/core/substrate/xcm-parser';
import { getExtrinsicByPolkadotXcmPallet } from '@subwallet/extension-base/services/balance-service/transfer/xcm/polkadotXcm';
import { getSnowBridgeEvmTransfer } from '@subwallet/extension-base/services/balance-service/transfer/xcm/snowBridge';
import { getExtrinsicByXcmPalletPallet } from '@subwallet/extension-base/services/balance-service/transfer/xcm/xcmPallet';
import { getExtrinsicByXtokensPallet } from '@subwallet/extension-base/services/balance-service/transfer/xcm/xTokens';
import { _XCM_CHAIN_GROUP } from '@subwallet/extension-base/services/chain-service/constants';
import { _EvmApi, _SubstrateApi } from '@subwallet/extension-base/services/chain-service/types';
import { _isChainEvmCompatible, _isNativeToken } from '@subwallet/extension-base/services/chain-service/utils';
import { Keyring } from '@subwallet/keyring';
import { ApiPromise, initialize, signedExtensions, types } from 'avail-js-sdk';
import BigN, { BigNumber } from 'bignumber.js';
import { TransactionConfig } from 'web3-core';

import { SubmittableExtrinsic } from '@polkadot/api/types';
import { isNumber, u8aToHex } from '@polkadot/util';
import { addressToEvm, decodeAddress, isEthereumAddress } from '@polkadot/util-crypto';
import {getERC20Contract} from "@subwallet/extension-base/koni/api/contract-handler/evm/web3";

type CreateXcmExtrinsicProps = {
  originTokenInfo: _ChainAsset;
  destinationTokenInfo: _ChainAsset;
  recipient: string;
  sendingValue: string;

  substrateApi: _SubstrateApi;
  chainInfoMap: Record<string, _ChainInfo>;
}

export enum TransactionStatus {
  INITIATED = 'INITIATED',
  BRIDGED = 'BRIDGED',
  READY_TO_CLAIM = 'READY_TO_CLAIM',
  CLAIMED = 'CLAIMED',
  FAILED = 'FAILED',
  CLAIM_PENDING = 'PENDING',
}

export interface Transaction {
  status: TransactionStatus,
  destinationChain: Chain,
  messageId: number,
  sourceChain: Chain,
  amount: string,
  dataType: 'ERC20',
  depositorAddress: `0x${string}` | string,
  receiverAddress: string,
  sourceBlockHash: `${string}`,
  sourceBlockNumber: number,
  sourceTransactionHash: string,
  sourceTransactionIndex: number,
  sourceTimestamp: string
  sourceTokenAddress?: `0x${string}`;
  destinationTransactionHash?: `0x${string}` | string;
  destinationTransactionBlockNumber?: number;
  destinationTransactionTimestamp?: number;
  destinationTransactionIndex?: number;
  destinationTokenAddress?: `0x${string}`;
  message?: string;
  blockHash?: `0x${string}`;
}

enum Chain {
  AVAIL = 'AVAIL',
  ETH = 'ETHEREUM',
}

function uint8ArrayToByte32String (uint8Array: Uint8Array) {
  // Ensure the input is Uint8Array
  if (!(uint8Array instanceof Uint8Array)) {
    throw new Error('Input must be a Uint8Array');
  }

  // Create a hex string from the Uint8Array
  let hexString = '';

  for (const byte of uint8Array as any) {
    hexString += byte.toString(16).padStart(2, '0');
  }

  // Ensure the hex string is 64 characters long
  if (hexString.length !== 64) {
    throw new Error('Input must be 32 bytes long');
  }

  return '0x' + hexString;
}

type CreateSnowBridgeExtrinsicProps = Omit<CreateXcmExtrinsicProps, 'substrateApi'> & {
  evmApi: _EvmApi;
  sender: string
}

const getInjectorMetadata = (api: ApiPromise) => {
  return {
    chain: api.runtimeChain.toString(),
    specVersion: api.runtimeVersion.specVersion.toNumber(),
    tokenDecimals: api.registry.chainDecimals[0] || 18,
    tokenSymbol: api.registry.chainTokens[0] || 'AVAIL',
    genesisHash: api.genesisHash.toHex(),
    ss58Format: isNumber(api.registry.chainSS58) ? api.registry.chainSS58 : 0,
    chainType: 'substrate' as const,
    icon: 'substrate',
    types: types as any,
    userExtensions: signedExtensions
  };
};

export const substrateAddressToPublicKey = (address: string) => {
  const accountId = address;

  // Instantiate a keyring
  const keyring = new Keyring({ type: 'sr25519' });

  // Add account using the account ID
  const pair = keyring.addFromAddress(accountId);
  const publicKeyByte8Array = pair.publicKey;

  // Get the public address
  const publicKeyByte32String = uint8ArrayToByte32String(publicKeyByte8Array);

  return publicKeyByte32String;
};

const NEXT_PUBLIC_AVAIL_RPC = 'wss://turing-rpc.avail.so/ws';

export const createSnowBridgeExtrinsic = async ({ chainInfoMap,
  destinationTokenInfo,
  evmApi,
  originTokenInfo,
  recipient,
  sender,
  sendingValue }: CreateSnowBridgeExtrinsicProps): Promise<TransactionConfig> => {
  const originChainInfo = chainInfoMap[originTokenInfo.originChain];
  const destinationChainInfo = chainInfoMap[destinationTokenInfo.originChain];

  if (!_isSnowBridgeXcm(originChainInfo, destinationChainInfo)) {
    throw new Error('This is not a valid SnowBridge transfer');
  }

  return getSnowBridgeEvmTransfer(originTokenInfo, originChainInfo, destinationChainInfo, sender, recipient, sendingValue, evmApi);
};

export const createXcmExtrinsic = async ({ chainInfoMap,
  destinationTokenInfo,
  originTokenInfo,
  recipient,
  sendingValue,
  substrateApi }: CreateXcmExtrinsicProps): Promise<SubmittableExtrinsic<'promise'>> => {
  const originChainInfo = chainInfoMap[originTokenInfo.originChain];
  const destinationChainInfo = chainInfoMap[destinationTokenInfo.originChain];

  const chainApi = await substrateApi.isReady;
  const api = chainApi.api;
  // const erc20Contract = getERC20Contract('0x967F7DdC4ec508462231849AE81eeaa68Ad01389', evmApi);

  let extrinsic;

  if (_XCM_CHAIN_GROUP.polkadotXcm.includes(originTokenInfo.originChain)) {
    if (['astar', 'shiden'].includes(originChainInfo.slug) && !_isNativeToken(originTokenInfo)) {
      console.log('log1: eth->avail');
      extrinsic = getExtrinsicByXtokensPallet(originTokenInfo, originChainInfo, destinationChainInfo, recipient, sendingValue, api);
    } else {
      console.log('log2: eth->avail');
      extrinsic = getExtrinsicByPolkadotXcmPallet(originTokenInfo, originChainInfo, destinationChainInfo, recipient, sendingValue, api);
    }
  } else if (_XCM_CHAIN_GROUP.xcmPallet.includes(originTokenInfo.originChain)) {
    console.log('log3: eth->avail');
    extrinsic = getExtrinsicByXcmPalletPallet(originTokenInfo, originChainInfo, destinationChainInfo, recipient, sendingValue, api);
  } else {
    console.log('log4: eth->avail');
    extrinsic = getExtrinsicByXtokensPallet(originTokenInfo, originChainInfo, destinationChainInfo, recipient, sendingValue, api);
  }

  return extrinsic;
};

export const getXcmMockTxFee = async (substrateApi: _SubstrateApi, chainInfoMap: Record<string, _ChainInfo>, originTokenInfo: _ChainAsset, destinationTokenInfo: _ChainAsset): Promise<BigN> => {
  try {
    const destChainInfo = chainInfoMap[destinationTokenInfo.originChain];
    const originChainInfo = chainInfoMap[originTokenInfo.originChain];
    const address = '5DRewsYzhJqZXU3SRaWy1FSt5iDr875ao91aw5fjrJmDG4Ap';

    // mock receiving account from sender
    const recipient = !isEthereumAddress(address) && _isChainEvmCompatible(destChainInfo) && !_isChainEvmCompatible(originChainInfo)
      ? u8aToHex(addressToEvm(address))
      : address
    ;

    const mockTx = await createXcmExtrinsic({
      chainInfoMap,
      destinationTokenInfo,
      originTokenInfo,
      recipient: recipient,
      sendingValue: '1000000000000000000',
      substrateApi
    });
    const paymentInfo = await mockTx.paymentInfo(address);

    return new BigN(paymentInfo?.partialFee?.toString() || '0');
  } catch (e) {
    console.error('error mocking xcm tx fee', e);

    return new BigN(0);
  }
};
