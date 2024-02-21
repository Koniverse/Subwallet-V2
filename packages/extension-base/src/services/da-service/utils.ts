// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Cell } from '@subwallet/extension-base/services/da-service/types';

export const AVAIL_CONFIG = {
  COMMITMENT_SIZE: 48,
  KATE_PROOF_SIZE: 80,
  EXTENSION_FACTOR: 2,
  SAMPLE_SIZE: 10,
  BLOCK_LIST_SIZE: 4
};

export const generateRandomCells = (r: number, c: number, count: number) => {
  const extendedRowCount = r * 2;
  const maxCellCount = extendedRowCount * c;
  let size = count;

  if (maxCellCount < count) {
    size = maxCellCount;
  }

  const cellList: Array<Cell> = [];
  const randomPointList = randomUniqueNum(maxCellCount, size);

  randomPointList.forEach((p) => {
    const row = Math.floor(p / c);
    const col = p - row * c;

    cellList.push({ row, col });
  });

  return cellList;
};

const randomUniqueNum = (range: number, outputCount: number) => {
  const arr = [];

  for (let i = 0; i < range; i++) {
    arr.push(i);
  }

  const result = [];

  for (let i = 1; i <= outputCount; i++) {
    const random = Math.floor(Math.random() * (range - i));

    result.push(arr[random]);
    arr[random] = arr[range - i];
  }

  return result;
};

export const AVAIL_DEFAULT_NETWORK = 'goldberg_testnet';
