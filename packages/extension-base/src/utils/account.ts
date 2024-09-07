// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountContract } from '@particle-network/aa';
import { AddressJson, SmartAccountData } from '@subwallet/extension-base/background/types';
import { reformatAddress } from '@subwallet/extension-base/utils/index';
import { keyring } from '@subwallet/ui-keyring';
import { SubjectInfo } from '@subwallet/ui-keyring/observable/types';

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

export const getEthereumSmartAccountOwner = (address: string): SmartAccountData | undefined => {
  try {
    const pair = keyring.getPair(address);

    const owner = pair.meta.smartAccountOwner;

    if (owner) {
      return {
        owner: owner as string,
        provider: pair.meta.aaProvider as AccountContract
      };
    } else {
      return undefined;
    }
  } catch (error) {
    return undefined;
  }
};
