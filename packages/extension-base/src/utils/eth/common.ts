// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { BigNumber as BigNEther } from '@ethersproject/bignumber';
import { Bytes } from '@ethersproject/bytes';
import BigN from 'bignumber.js';
import BNEther from 'bn.js';

import { u8aToHex } from '@polkadot/util';

export const hexToNumberString = (s: string): string => {
  const temp = parseInt(s, 16);

  if (isNaN(temp)) {
    return '0';
  } else {
    return temp.toString();
  }
};

const isBytes = (value: Bytes | BNEther | BigNEther): value is Bytes => {
  return Array.isArray(value);
};

export const anyNumberToBN = (value?: string | number | bigint | Bytes | BNEther | BigNEther): BigN => {
  if (typeof value === 'string' || typeof value === 'number') {
    return new BigN(value);
  } else if (typeof value === 'undefined') {
    return new BigN(0);
  } else if (typeof value === 'bigint') {
    return new BigN(value.toString(16));
  } else if (isBytes(value)) {
    return new BigN(u8aToHex(new Uint8Array(value)));
  } else if (value instanceof BigNEther) {
    return new BigN(value.toHexString());
  } else {
    return new BigN(value.toNumber());
  }
};
