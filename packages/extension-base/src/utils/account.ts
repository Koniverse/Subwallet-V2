// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import { AccountJson, AddressJson } from '@subwallet/extension-base/types';
import { reformatAddress } from '@subwallet/extension-base/utils/index';
import { SingleAddress, SubjectInfo } from '@subwallet/ui-keyring/observable/types';

import { decodeAddress, encodeAddress, isAddress, isEthereumAddress } from '@polkadot/util-crypto';

export const simpleAddress = (address: string): string => {
  if (isEthereumAddress(address)) {
    return address;
  }

  return encodeAddress(decodeAddress(address));
};

export function quickFormatAddressToCompare (address?: string) {
  if (!isAddress(address)) {
    return address;
  }

  return reformatAddress(address, 42).toLowerCase();
}

export const convertSubjectInfoToAddresses = (subjectInfo: SubjectInfo): AddressJson[] => {
  return Object.values(subjectInfo).map((info): AddressJson => ({ address: info.json.address, type: info.type, ...info.json.meta }));
};

export const transformAccount = ({ json: { address, meta }, type }: SingleAddress): AccountJson => {
  const accountActions: string[] = [];
  const transactionActions: ExtrinsicType[] = [];

  return {
    address,
    ...meta,
    type,
    accountActions,
    transactionActions
  };
};

export const transformAccounts = (accounts: SubjectInfo): AccountJson[] => Object.values(accounts).map(transformAccount);
