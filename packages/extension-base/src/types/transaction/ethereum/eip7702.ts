// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { SignAuthorizationParameters } from '@subwallet/keyring/types';

import { HexString } from '@polkadot/util/types';

export enum EIP7702DelegateType {
  KERNEL_V3 = 'KERNEL_V3',
  SAFE = 'SAFE',
  REMOVE = 'REMOVE'
}

export interface SignAuthEIP7702 extends SignAuthorizationParameters {
  chain: string;
  delegateType: EIP7702DelegateType;
  address: string;
}

export interface RequestAccountDelegateEIP7702 {
  address: string;
  chain: string;
  delegateType: EIP7702DelegateType;
}

export interface AccountDelegateEIP7702Data extends RequestAccountDelegateEIP7702{
  delegateAddress: string;
}

export interface RequestAccountUnDelegateEIP7702 {
  address: string;
  chain: string;
}

export interface RequestHandleTransactionWith7702 {
  address: string;
  chain: string;
  delegateType: EIP7702DelegateType;
  calls: Array<{
    to: HexString;
    data?: HexString;
    value?: HexString;
  }>
}
