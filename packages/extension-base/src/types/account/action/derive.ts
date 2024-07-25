// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

export interface RequestDeriveCreateV2 {
  name: string;
  genesisHash?: string | null;
  suri: string;
  parentAddress: string;
  isAllowed: boolean;
}

export interface CreateDeriveAccountInfo {
  name: string;
  suri: string;
}

export interface RequestDeriveCreateV3 {
  address: string;
}

export interface RequestDeriveCreateMultiple {
  parentAddress: string;
  isAllowed: boolean;
  items: CreateDeriveAccountInfo[];
}

export interface DeriveAccountInfo {
  address: string;
  suri: string;
}

export interface RequestDeriveValidateV2 {
  suri: string;
  parentAddress: string;
}

export type ResponseDeriveValidateV2 = DeriveAccountInfo;

export interface RequestGetDeriveAccounts {
  page: number;
  limit: number;
  parentAddress: string;
}

export interface ResponseGetDeriveAccounts {
  result: DeriveAccountInfo[];
}

export interface RequestDeriveAccountProxy {
  proxyId: string;
  suri?: string;
}
