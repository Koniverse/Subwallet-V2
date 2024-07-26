// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { KeypairType, KeyringPair, KeyringPair$Meta } from '@subwallet/keyring/types';
import { keyring } from '@subwallet/ui-keyring';
import { t } from 'i18next';

import { assert } from '@polkadot/util';

interface DeriveInfo {
  suri?: string;
  deriveIndex?: number;
}

interface NextDerivePair {
  address: string;
  deriveIndex: number;
  meta: KeyringPair$Meta;
}

const SUBSTRATE_TYPE: KeypairType[] = ['ed25519', 'sr25519', 'ecdsa'];

export const getDerivationInfo = (pair: KeyringPair): DeriveInfo => {
  const isSubstrate = SUBSTRATE_TYPE.includes(pair.type);

  const suri = pair.meta.suri as string;

  if (suri) {
    if (/^\/\/\d+$/.test(suri)) {
      const _deriveIndex = parseInt(suri.replace('//', ''), 10);
      const deriveIndex = isSubstrate ? _deriveIndex : _deriveIndex - 1;

      return { suri, deriveIndex };
    } else {
      return { suri };
    }
  } else {
    return {};
  }
};

export const findNextDerivePair = (parentAddress: string): NextDerivePair => {
  const parentPair = keyring.getPair(parentAddress);

  assert(parentPair, t('Unable to find account'));

  const isEvm = parentPair.type === 'ethereum';

  if (parentPair.isLocked) {
    keyring.unlockPair(parentPair.address);
  }

  const pairs = keyring.getPairs();
  const children = pairs.filter((p) => p.meta.parentAddress === parentAddress);
  const childrenMetadata = children.map(getDerivationInfo).sort((a, b) => {
    if (a.deriveIndex !== undefined && b.deriveIndex !== undefined) {
      return a.deriveIndex - b.deriveIndex;
    } else {
      if (a.deriveIndex === undefined && b.deriveIndex === undefined) {
        return 0;
      } else {
        return a.deriveIndex === undefined ? -1 : 1;
      }
    }
  });

  let valid = false;
  let index = 0;

  for (const { deriveIndex, suri } of childrenMetadata) {
    if (!suri || deriveIndex === undefined) {
      valid = false;
      break;
    }

    if (deriveIndex === index) {
      index++;
    } else {
      break;
    }
  }

  assert(valid, t('Unable to find next derive path'));

  const meta = {
    parentAddress,
    suri: `//${index}`
  };

  const childPair = isEvm ? parentPair.evm.derive(index, meta) : parentPair.substrate.derive(meta.suri, meta);
  const address = childPair.address;

  return {
    address,
    deriveIndex: index,
    meta
  };
};
