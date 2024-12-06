// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { _ChainAsset, _ChainInfo } from '@subwallet/chain-list/types';
import { _isPolygonBridgeXcm, _isPosBridgeXcm, _isSnowBridgeXcm } from '@subwallet/extension-base/core/substrate/xcm-parser';
import { getAvailBridgeExtrinsicFromAvail, getAvailBridgeTxFromEth } from '@subwallet/extension-base/services/balance-service/transfer/xcm/availBridge';
import { getExtrinsicByPolkadotXcmPallet } from '@subwallet/extension-base/services/balance-service/transfer/xcm/polkadotXcm';
import { _createPolygonBridgeL1toL2Extrinsic, _createPolygonBridgeL2toL1Extrinsic } from '@subwallet/extension-base/services/balance-service/transfer/xcm/polygonBridge';
import { getSnowBridgeEvmTransfer } from '@subwallet/extension-base/services/balance-service/transfer/xcm/snowBridge';
import { getExtrinsicByXcmPalletPallet } from '@subwallet/extension-base/services/balance-service/transfer/xcm/xcmPallet';
import { getExtrinsicByXtokensPallet } from '@subwallet/extension-base/services/balance-service/transfer/xcm/xTokens';
import { _XCM_CHAIN_GROUP } from '@subwallet/extension-base/services/chain-service/constants';
import { _EvmApi, _SubstrateApi } from '@subwallet/extension-base/services/chain-service/types';
import { _isChainEvmCompatible, _isNativeToken } from '@subwallet/extension-base/services/chain-service/utils';
import BigN from 'bignumber.js';
import { TransactionConfig } from 'web3-core';

import { SubmittableExtrinsic } from '@polkadot/api/types';
import { u8aToHex } from '@polkadot/util';
import { addressToEvm } from '@polkadot/util-crypto';

import { _createPosBridgeL1toL2Extrinsic, _createPosBridgeL2toL1Extrinsic, _isPosChainBridge } from './posBridge';

export type CreateXcmExtrinsicProps = {
  originTokenInfo: _ChainAsset;
  destinationTokenInfo: _ChainAsset;
  recipient: string;
  sendingValue: string;
  evmApi?: _EvmApi;
  substrateApi?: _SubstrateApi;
  chainInfoMap: Record<string, _ChainInfo>;
  sender?: string;
}

export type FunctionCreateXcmExtrinsic = (props: CreateXcmExtrinsicProps) => Promise<SubmittableExtrinsic<'promise'> | TransactionConfig>;

export const createSnowBridgeExtrinsic = async ({ chainInfoMap,
  destinationTokenInfo,
  evmApi,
  originTokenInfo,
  recipient,
  sender,
  sendingValue }: CreateXcmExtrinsicProps): Promise<TransactionConfig> => {
  const originChainInfo = chainInfoMap[originTokenInfo.originChain];
  const destinationChainInfo = chainInfoMap[destinationTokenInfo.originChain];

  if (!_isSnowBridgeXcm(originChainInfo, destinationChainInfo)) {
    throw new Error('This is not a valid SnowBridge transfer');
  }

  if (!evmApi) {
    throw Error('Evm API is not available');
  }

  if (!sender) {
    throw Error('Sender is required');
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

  if (!substrateApi) {
    throw Error('Substrate API is not available');
  }

  const chainApi = await substrateApi.isReady;
  const api = chainApi.api;

  const polkadotXcmSpecialCases = _XCM_CHAIN_GROUP.polkadotXcmSpecialCases.includes(originChainInfo.slug) && _isNativeToken(originTokenInfo);

  if (_XCM_CHAIN_GROUP.polkadotXcm.includes(originTokenInfo.originChain) || polkadotXcmSpecialCases) {
    return getExtrinsicByPolkadotXcmPallet(originTokenInfo, originChainInfo, destinationChainInfo, recipient, sendingValue, api);
  }

  if (_XCM_CHAIN_GROUP.xcmPallet.includes(originTokenInfo.originChain)) {
    return getExtrinsicByXcmPalletPallet(originTokenInfo, originChainInfo, destinationChainInfo, recipient, sendingValue, api);
  }

  return getExtrinsicByXtokensPallet(originTokenInfo, originChainInfo, destinationChainInfo, recipient, sendingValue, api);
};

export const createAvailBridgeTxFromEth = ({ chainInfoMap,
  evmApi,
  originTokenInfo,
  recipient,
  sender,
  sendingValue }: CreateXcmExtrinsicProps): Promise<TransactionConfig> => {
  const originChainInfo = chainInfoMap[originTokenInfo.originChain];

  if (!evmApi) {
    throw Error('Evm API is not available');
  }

  if (!sender) {
    throw Error('Sender is required');
  }

  return getAvailBridgeTxFromEth(originChainInfo, sender, recipient, sendingValue, evmApi);
};

export const createAvailBridgeExtrinsicFromAvail = async ({ recipient, sendingValue, substrateApi }: CreateXcmExtrinsicProps): Promise<SubmittableExtrinsic<'promise'>> => {
  if (!substrateApi) {
    throw Error('Substrate API is not available');
  }

  return await getAvailBridgeExtrinsicFromAvail(recipient, sendingValue, substrateApi);
};

export const createPolygonBridgeExtrinsic = async ({ chainInfoMap,
  destinationTokenInfo,
  evmApi,
  originTokenInfo,
  recipient,
  sender,
  sendingValue }: CreateXcmExtrinsicProps): Promise<TransactionConfig> => {
  const originChainInfo = chainInfoMap[originTokenInfo.originChain];
  const destinationChainInfo = chainInfoMap[destinationTokenInfo.originChain];
  const isPolygonBridgeXcm = _isPolygonBridgeXcm(originChainInfo, destinationChainInfo);

  const isValidBridge = isPolygonBridgeXcm || _isPosBridgeXcm(originChainInfo, destinationChainInfo);

  if (!isValidBridge) {
    throw new Error('This is not a valid PolygonBridge transfer');
  }

  if (!evmApi) {
    throw Error('Evm API is not available');
  }

  if (!sender) {
    throw Error('Sender is required');
  }

  const sourceChain = originChainInfo.slug;

  const createExtrinsic = isPolygonBridgeXcm
    ? (sourceChain === 'polygonzkEvm_cardona' || sourceChain === 'polygonZkEvm')
      ? _createPolygonBridgeL2toL1Extrinsic
      : _createPolygonBridgeL1toL2Extrinsic
    : (sourceChain === 'polygon_amoy' || sourceChain === 'polygon')
      ? _createPosBridgeL2toL1Extrinsic
      : _createPosBridgeL1toL2Extrinsic;

  return createExtrinsic(originTokenInfo, originChainInfo, sender, recipient, sendingValue, evmApi);
};

export const getXcmMockTxFee = async (substrateApi: _SubstrateApi, chainInfoMap: Record<string, _ChainInfo>, originTokenInfo: _ChainAsset, destinationTokenInfo: _ChainAsset): Promise<BigN> => {
  try {
    const destChainInfo = chainInfoMap[destinationTokenInfo.originChain];
    const originChainInfo = chainInfoMap[originTokenInfo.originChain];
    const fakeAddress = '5DRewsYzhJqZXU3SRaWy1FSt5iDr875ao91aw5fjrJmDG4Ap'; // todo: move this
    const substrateAddress = fakeAddress; // todo: move this
    const evmAddress = u8aToHex(addressToEvm(fakeAddress)); // todo: move this

    // mock receiving account from sender
    const sender = _isChainEvmCompatible(originChainInfo) ? evmAddress : substrateAddress;
    const recipient = _isChainEvmCompatible(destChainInfo) ? evmAddress : substrateAddress;

    const mockTx = await createXcmExtrinsic({
      chainInfoMap,
      destinationTokenInfo,
      originTokenInfo,
      sender,
      recipient,
      sendingValue: '1000000000000000000',
      substrateApi
    });
    const paymentInfo = await mockTx.paymentInfo(fakeAddress);

    return new BigN(paymentInfo?.partialFee?.toString() || '0');
  } catch (e) {
    console.error('error mocking xcm tx fee', e);

    return new BigN(0);
  }
};
