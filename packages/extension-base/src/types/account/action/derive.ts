// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { SWErrorData } from '@subwallet/extension-base/types';
import { KeypairType } from '@subwallet/keyring/types';

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
  suri: string;
}

export interface DeriveAccountInfo {
  address: string;
  suri: string;
}

export interface RequestDeriveValidateV2 {
  suri: string;
  proxyId: string;
}

export type ResponseDeriveValidateV2 = {
  info: DerivePathInfo | undefined;
  error?: SWErrorData;
};

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
  info?: {
    suri: string;
    derivationPath?: string;
  }
  error?: SWErrorData;
}

export interface DeriveInfo {
  parentAddress?: string;
  suri?: string;
  derivationPath?: string;
  depth: number;
  autoIndexes?: Array<number|undefined>;
}

export interface NextDerivePair {
  deriveIndex: number;
  derivationPath?: string;
  deriveAddress: string;
  depth: number;
  suri: string;
}

export interface IDerivePathInfo_ {
  type: KeypairType;
  suri: string;
  depth: number;
  autoIndexes?: Array<number|undefined>;
  derivationPath?: string;
}

export interface DerivePathInfo extends Omit<IDerivePathInfo_, 'type'> {
  type: KeypairType | 'unified';
}
