// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

export interface RequestInputAccountSubscribe {
  data: string;
  chain: string;
}

export enum AnalyzedGroup {
  WALLET = 'wallet',
  CONTACT = 'contact',
  DOMAIN = 'domain',
  RECENT = 'recent'
}

export interface AnalyzeAddress {
  address: string;
  proxyId?: string;
  formatedAddress: string;
  analyzedGroup: AnalyzedGroup;
  displayName?: string;
}

export interface ResponseInputAccountSubscribe {
  id: string;
  options: AnalyzeAddress[];
  current?: AnalyzeAddress;
}
