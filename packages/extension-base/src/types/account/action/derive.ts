// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

export interface CreateDeriveAccountInfo {
  name: string;
  suri: string;
}

/**
 * @deprecated
 * */
export interface RequestDeriveCreateMultiple {
  parentAddress: string;
  isAllowed: boolean;
  items: CreateDeriveAccountInfo[];
}

export interface RequestDeriveCreateV3 {
  proxyId: string;
  name: string;
  suri?: string;
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

/**
 * @deprecated
 * */
export interface ResponseGetDeriveAccounts {
  result: DeriveAccountInfo[];
}

export interface RequestGetDeriveSuggestion {
  proxyId: string;
}

export interface ResponseGetDeriveSuggestion {
  proxyId: string;
  suri: string;
}
