// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import { ALL_ACCOUNT_KEY } from '@subwallet/extension-base/constants';
import { AccountJson, AccountMetadataData, AccountSignMode, AddressJson } from '@subwallet/extension-base/types';
import { reformatAddress } from '@subwallet/extension-base/utils/index';
import { KeyringPair, KeyringPair$Meta } from '@subwallet/keyring/types';
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

export const getAccountSignMode = (address: string, _meta?: KeyringPair$Meta): AccountSignMode => {
  const meta = _meta as AccountMetadataData;

  if (!address) {
    return AccountSignMode.UNKNOWN;
  } else {
    if (address === ALL_ACCOUNT_KEY) {
      return AccountSignMode.ALL_ACCOUNT;
    } else {
      if (meta.isInjected) {
        return AccountSignMode.INJECTED;
      }

      if (meta.isExternal) {
        if (meta.isHardware) {
          if (meta.isGeneric) {
            return AccountSignMode.GENERIC_LEDGER;
          } else {
            return AccountSignMode.LEGACY_LEDGER;
          }
        } else if (meta.isReadOnly) {
          return AccountSignMode.READ_ONLY;
        } else {
          return AccountSignMode.QR;
        }
      } else {
        return AccountSignMode.PASSWORD;
      }
    }
  }
};

export const transformAccount = (account: SingleAddress): AccountJson => {
  const { json: { address, meta }, type } = account;
  const accountActions: string[] = [];
  const transactionActions: ExtrinsicType[] = [];
  const signMode = getAccountSignMode(address, meta);

  return {
    address,
    ...meta,
    type,
    accountActions,
    transactionActions,
    signMode
  };
};

export const transformAccountFromPair = (account: KeyringPair): AccountJson => {
  const { address, meta, type } = account;
  const accountActions: string[] = [];
  const transactionActions: ExtrinsicType[] = [];
  const signMode = getAccountSignMode(address, meta);

  return {
    address,
    ...meta,
    type,
    accountActions,
    transactionActions,
    signMode
  };
};

export const transformAccounts = (accounts: SubjectInfo): AccountJson[] => Object.values(accounts).map(transformAccount);
