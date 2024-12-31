// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { DerivePathInfo, IDerivePathInfo_ } from '@subwallet/extension-base/types';
import { KeypairType, SubstrateKeypairType } from '@subwallet/keyring/types';

export const validateUnifiedDerivationPath = (raw: string): DerivePathInfo | undefined => {
  const reg = /^\/\/(\d+)(\/\/\d+)?$/;

  if (raw.match(reg)) {
    const [, firstIndex, secondData] = raw.match(reg) as string[];
    const first = parseInt(firstIndex, 10);
    const autoIndexes: number[] = [first];

    let depth: number;
    let suri = `//${first}`;

    if (first === 0) {
      depth = 0;
    } else {
      depth = 1;
    }

    if (secondData) {
      const [, secondIndex] = secondData.match(/\/\/(\d+)/) as string[];

      const second = parseInt(secondIndex, 10);

      autoIndexes.push(second);
      depth = 2;
      suri += `//${second}`;
    }

    if (depth === 0) {
      return undefined;
    }

    return {
      depth,
      type: 'unified',
      suri,
      autoIndexes
    };
  } else {
    return undefined;
  }
};

export const validateEvmDerivationPath = (raw: string): IDerivePathInfo_ | undefined => {
  const reg = /^m\/44'\/60'\/0'\/0\/(\d+)(\/\d+)?$/;

  if (raw.match(reg)) {
    const [, firstIndex, secondData] = raw.match(reg) as string[];

    const first = parseInt(firstIndex, 10);
    const autoIndexes: number[] = [first];

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

      autoIndexes.push(second);
      depth = 2;
      suri += `//${second}`;
    }

    return {
      depth,
      type: 'ethereum',
      suri,
      derivationPath: raw,
      autoIndexes
    };
  } else {
    return undefined;
  }
};

export const validateTonDerivationPath = (raw: string): IDerivePathInfo_ | undefined => {
  const reg = /^m\/44'\/607'\/(\d+)'(\/\d+')?$/;

  if (raw.match(reg)) {
    const [, firstIndex, secondData] = raw.match(reg) as string[];
    const first = parseInt(firstIndex, 10);
    const autoIndexes: number[] = [first];

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

      autoIndexes.push(second);
      depth = 2;
      suri += `//${second}`;
    }

    return {
      depth,
      type: 'ton',
      suri,
      derivationPath: raw,
      autoIndexes
    };
  } else {
    return undefined;
  }
};

export const validateCardanoDerivationPath = (raw: string): IDerivePathInfo_ | undefined => {
  const reg = /^m\/1852'\/1815'\/(\d+)'(\/\d+')?$/;

  if (raw.match(reg)) {
    const [, firstIndex, secondData] = raw.match(reg) as string[];

    const first = parseInt(firstIndex, 10);
    const autoIndexes: number[] = [first];

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

      autoIndexes.push(second);
      depth = 2;
      suri += `//${second}`;
    }

    return {
      depth,
      type: 'cardano',
      suri,
      derivationPath: raw,
      autoIndexes
    };
  } else {
    return undefined;
  }
};

export const validateSr25519DerivationPath = (raw: string): IDerivePathInfo_ | undefined => {
  const reg = /\/(\/?)([^/]+)/g;
  const parts = raw.match(reg);
  let constructed = '';

  if (parts) {
    constructed = parts.join('');
  }

  if (constructed !== raw || !parts) {
    return undefined;
  }

  const autoIndexes = parts.map((part) => {
    const reg = /^\/\/(\d+)$/;

    if (part.match(reg)) {
      return parseInt(part.replace('//', ''), 10);
    } else {
      return undefined;
    }
  });

  return {
    depth: parts.length,
    type: 'sr25519',
    suri: raw,
    autoIndexes
  };
};

export const validateOtherSubstrateDerivationPath = (raw: string, type: Exclude<SubstrateKeypairType, 'sr25519'>): IDerivePathInfo_ | undefined => {
  const reg = /\/\/([^/]+)/g;
  const parts = raw.match(reg);
  let constructed = '';

  if (parts) {
    constructed = parts.join('');
  }

  if (constructed !== raw || !parts) {
    return undefined;
  }

  const autoIndexes = parts.map((part) => {
    const reg = /^\/\/(\d+)$/;

    if (part.match(reg)) {
      return parseInt(part.replace('//', ''), 10);
    } else {
      return undefined;
    }
  });

  return {
    depth: parts.length,
    type,
    suri: raw,
    autoIndexes
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
    } else if (type === 'cardano') {
      return validateCardanoDerivationPath(raw);
    } else {
      return undefined;
    }
  } else {
    return validateUnifiedDerivationPath(raw) || validateEvmDerivationPath(raw) || validateTonDerivationPath(raw) || validateSr25519DerivationPath(raw) || validateCardanoDerivationPath(raw);
  }
};
