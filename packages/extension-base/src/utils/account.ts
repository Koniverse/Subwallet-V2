// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AddressJson } from '@subwallet/extension-base/background/types';
import { reformatAddress } from '@subwallet/extension-base/utils/index';
import { SubjectInfo } from '@subwallet/ui-keyring/observable/types';

import { isAddress } from '@polkadot/util-crypto';

export function quickFormatAddressToCompare (address?: string) {
  if (!isAddress(address)) {
    return address;
  }

  return reformatAddress(address, 42).toLowerCase();
}

export const convertSubjectInfoToAddresses = (subjectInfo: SubjectInfo): AddressJson[] => {
  return Object.values(subjectInfo).map((info): AddressJson => ({ address: info.json.address, type: info.type, ...info.json.meta }));
};
