// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { getDerivePath } from '@subwallet/keyring';
import { EthereumKeypairTypes, KeypairType, KeyringPair, SubstrateKeypairTypes, TonWalletContractVersion } from '@subwallet/keyring/types';
import { keyring } from '@subwallet/ui-keyring';
import { t } from 'i18next';

import { assert } from '@polkadot/util';

interface DeriveInfo {
  suri?: string;
  deriveIndex?: number;
}

interface NextDerivePair {
  deriveIndex: number;
  suri: string;
}

export const getDerivationInfo = (type: KeypairType, suri?: string): DeriveInfo => {
  const isSubstrate = SubstrateKeypairTypes.includes(type);

  if (suri) {
    if (/^\/\/\d+$/.test(suri)) {
      const _deriveIndex = parseInt(suri.replace('//', ''), 10);
      const deriveIndex = isSubstrate ? _deriveIndex + 1 : _deriveIndex;

      return { suri, deriveIndex };
    } else {
      return { suri };
    }
  } else {
    return {};
  }
};

/**
 * @func findNextDerivePair
 * @return {NextDerivePair}
 * Substrate: index: `n` - suri: `//n`
 * Ethereum, Ton, Bitcoin: index: `n` - suri: `//n+1` - derivation: `m/44'/60'/0'/0/n+1` (Example)
 * */
export const findNextDerivePair = (parentAddress: string): NextDerivePair => {
  const parentPair = keyring.getPair(parentAddress);

  assert(parentPair, t('Unable to find account'));

  const pairs = keyring.getPairs();
  const children = pairs.filter((p) => p.meta.parentAddress === parentAddress);
  const childrenMetadata = children.map(({ meta: { suri }, type }) => getDerivationInfo(type, suri as string | undefined)).sort((a, b) => {
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

  let valid = true;
  let index = 1;

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

  const isSubstrate = SubstrateKeypairTypes.includes(parentPair.type);
  const _deriveIndex = index;

  if (isSubstrate) {
    index--; // For substrate account, we decrease by 1
  }

  const suri = `//${index}`;

  return {
    deriveIndex: _deriveIndex,
    suri
  };
};

export const derivePair = (parentPair: KeyringPair, name: string, deriveIndex: number): KeyringPair => {
  if (parentPair.isLocked) {
    keyring.unlockPair(parentPair.address);
  }

  const isEvm = EthereumKeypairTypes.includes(parentPair.type);
  const isSubstrate = SubstrateKeypairTypes.includes(parentPair.type);
  const isTon = parentPair.type === 'ton';
  let _deriveIndex = deriveIndex;

  if (isSubstrate) {
    _deriveIndex--; // For substrate account, we decrease by 1
  }

  const suri = `//${_deriveIndex}`;
  const meta = {
    name,
    parentAddress: parentPair.address,
    suri: suri,
    tonContractVersion: undefined as unknown as TonWalletContractVersion
  };

  if (isTon && parentPair.ton?.contractVersion) {
    meta.tonContractVersion = parentPair.ton.contractVersion;
  }

  return isEvm
    ? parentPair.evm.derive(_deriveIndex, meta)
    : isTon
      ? parentPair.ton.derive(_deriveIndex, meta)
      : parentPair.substrate.derive(suri, meta)
  ;
};

export const getSuri = (seed: string, type?: KeypairType): string => {
  const extraPath = type ? getDerivePath(type)(0) : '';

  return seed + (extraPath ? '/' + extraPath : '');
};
