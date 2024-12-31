// Copyright 2019-2022 @polkadot/extension authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { randomAsU8a } from '@polkadot/util-crypto';

import { ID_PREFIX } from '../defaults';

let counter = 0;

export function getId (): string {
  return `${ID_PREFIX}.${Date.now()}.${++counter}`;
}

export const generateRandomString = (length = 6) => Buffer.from(randomAsU8a(Math.ceil(length / 2))).toString('hex').slice(0, length);
