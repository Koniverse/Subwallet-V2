// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { DerivePathInfo } from '@subwallet/extension-base/types';
import { KeypairType, SubstrateKeypairType } from '@subwallet/keyring/types';

export const validateUnifiedDerivationPath = (raw: string): DerivePathInfo | undefined => {
  const reg = /^\/\/(\d+)(\/\/\d)?$/;

  if (raw.match(reg)) {
    const [, firstIndex, secondData] = raw.match(reg) as string[];

    const first = parseInt(firstIndex, 10);

    let depth = 1;
    let suri = `//${first}`;

    if (secondData) {
      const [, secondIndex] = secondData.match(/\/\/(\d+)/) as string[];

      const second = parseInt(secondIndex, 10);

      depth = 2;

      suri += `//${second}`;
    }

    return {
      depth,
      raw,
      type: 'unified',
      suri
    };
  } else {
    return undefined;
  }
};

export const validateEvmDerivationPath = (raw: string): DerivePathInfo | undefined => {
  const reg = /^m\/44'\/60'\/0'\/0\/(\d+)(\/\d+)?$/;

  if (raw.match(reg)) {
    const [, firstIndex, secondData] = raw.match(reg) as string[];

    const first = parseInt(firstIndex, 10);

    let depth: number;
    let suri = `//${first}`;

    if (first === 0) {
      depth = 0;
    } else {
      depth = 1;
    }

    if (secondData) {
      const [, secondIndex] = secondData.match(/\/(\d+)/) as string[];

      const second = parseInt(secondIndex, 10);

      depth = 2;

      suri += `//${second}`;
    }

    return {
      depth,
      raw,
      type: 'ethereum',
      suri
    };
  } else {
    return undefined;
  }
};

export const validateTonDerivationPath = (raw: string): DerivePathInfo | undefined => {
  const reg = /^m\/44'\/607'\/(\d+)'(\/\d+')?$/;

  if (raw.match(reg)) {
    const [, firstIndex, secondData] = raw.match(reg) as string[];

    const first = parseInt(firstIndex, 10);

    let depth: number;
    let suri = `//${first}`;

    if (first === 0) {
      depth = 0;
    } else {
      depth = 1;
    }

    if (secondData) {
      const [, secondIndex] = secondData.match(/\/(\d+)'/) as string[];

      const second = parseInt(secondIndex, 10);

      depth = 2;

      suri += `//${second}`;
    }

    return {
      depth,
      raw,
      type: 'ton',
      suri
    };
  } else {
    return undefined;
  }
};

export const validateSr25519DerivationPath = (raw: string): DerivePathInfo | undefined => {
  const reg = /\/(\/?)([^/]+)/g;
  const parts = raw.match(reg);
  let constructed = '';

  if (parts) {
    constructed = parts.join('');
  }

  if (constructed !== raw || !parts) {
    return undefined;
  }

  return {
    depth: parts.length,
    type: 'sr25519',
    raw,
    suri: raw
  };
};

export const validateOtherSubstrateDerivationPath = (raw: string, type: Exclude<SubstrateKeypairType, 'sr25519'>): DerivePathInfo | undefined => {
  const reg = /\/\/([^/]+)/g;
  const parts = raw.match(reg);
  let constructed = '';

  if (parts) {
    constructed = parts.join('');
  }

  if (constructed !== raw || !parts) {
    return undefined;
  }

  return {
    depth: parts.length,
    type,
    raw,
    suri: raw
  };
};

export const validateDerivationPath = (raw: string, type?: KeypairType): DerivePathInfo | undefined => {
  if (type) {
    if (type === 'ethereum') {
      return validateEvmDerivationPath(raw);
    } else if (type === 'ton') {
      return validateTonDerivationPath(raw);
    } else if (type === 'sr25519') {
      return validateSr25519DerivationPath(raw);
    } else if (type === 'ed25519' || type === 'ecdsa') {
      return validateOtherSubstrateDerivationPath(raw, type);
    } else {
      return undefined;
    }
  } else {
    return validateUnifiedDerivationPath(raw) || validateEvmDerivationPath(raw) || validateTonDerivationPath(raw) || validateSr25519DerivationPath(raw);
  }
};
