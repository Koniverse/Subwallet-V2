// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

export enum AAAccountType {
  EOA = 'eoa',
  CONTRACT = 'contract'
}

/**
 * Chain id
 * - If negative, it means the chain id is not supported
 * - If positive, it means the chain id is supported
 * */
type ChainId = bigint;

export enum AAProvider {
  KLASTER = 'klaster',
  PARTICLE = 'particle'
}

// TODO: Improve
export interface AAProviderConfig {
  name: string;
  version: string;
}

export interface AAAccount {
  address: string;
  // In case empty, it means the account is supported in all chains
  chainIds: ChainId[];
  type: AAAccountType;
  providerConfig?: AAProviderConfig;
  provider?: AAProvider;
  owner?: string;
}

export interface AAProxy {
  id: string;
  owner: string;
  accounts: AAAccount[];
}

export interface AAServiceConfig {
  providers: AAProvider[];
  providerConfig: Record<AAProvider, AAProviderConfig>;
}

export interface AAServiceConfigInit {
  providers: AAProvider[];
  providerConfig: Partial<Record<AAProvider, AAProviderConfig>>;
}

export type AAProxyMap = Record<string, AAProxy>;
