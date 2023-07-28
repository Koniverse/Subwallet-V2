// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Commitment, ConnectionConfig } from '@solana/web3.js';
import { _CosmosInfo } from '@subwallet/chain-list/types';
import { MetadataItem } from '@subwallet/extension-base/background/KoniTypes';

import { ApiPromise } from '@polkadot/api';

export interface _EvmChainSpec {
  evmChainId: number,
  name: string,
  symbol: string,
  decimals: number,
  existentialDeposit: string
}

export interface _SubstrateChainSpec {
  name: string,
  addressPrefix: number,
  genesisHash: string,
  symbol: string,
  decimals: number,
  existentialDeposit: string,
  paraId: number | null
}

export interface _ApiOptions {
  providerName?: string,
  metadata?: MetadataItem,
  onUpdateStatus?: (isConnected: boolean) => void;
  externalApiPromise?: ApiPromise;
  cosmosChainInfo?: _CosmosInfo;
  solanaCommitment?: Commitment | ConnectionConfig;
}

export enum _CHAIN_VALIDATION_ERROR {
  INVALID_INFO_TYPE = 'invalidInfoType',
  INJECT_SCRIPT_DETECTED = 'injectScriptDetected',
  EXISTED_CHAIN = 'existedChain',
  EXISTED_PROVIDER = 'existedProvider',
  INVALID_PROVIDER = 'invalidProvider',
  NONE = 'none',
  CONNECTION_FAILURE = 'connectionFailure',
  PROVIDER_NOT_SAME_CHAIN = 'providerNotSameChain'
}
