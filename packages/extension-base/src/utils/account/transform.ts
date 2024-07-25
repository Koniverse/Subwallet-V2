// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import { ALL_ACCOUNT_KEY } from '@subwallet/extension-base/constants';
import { AccountJson, AccountMetadataData, AccountSignMode } from '@subwallet/extension-base/types';
import { KeyringPair, KeyringPair$Meta } from '@subwallet/keyring/types';
import { SingleAddress, SubjectInfo } from '@subwallet/ui-keyring/observable/types';

import { KeypairType } from '@polkadot/util-crypto/types';

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

export const transformAccount = (address: string, type?: KeypairType, meta?: KeyringPair$Meta): AccountJson => {
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

export const singleAddressToAccount = ({ json: { address, meta }, type }: SingleAddress): AccountJson => transformAccount(address, type, meta);

export const pairToAccount = ({ address, meta, type }: KeyringPair): AccountJson => transformAccount(address, type, meta);

export const transformAccounts = (accounts: SubjectInfo): AccountJson[] => Object.values(accounts).map(singleAddressToAccount);
