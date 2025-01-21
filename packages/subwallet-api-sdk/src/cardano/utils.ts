// Copyright 2017-2022 @subwallet/subwallet-api-sdk authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { SubWalletResponse } from '@subwallet/subwallet-api-sdk/sdk';

export type SWFetchCardanoTx = SubWalletResponse<string>;

export interface BuildCardanoTxParams {
  tokenDecimals: number;
  cardanoId: string;
  from: string;
  to: string;
  value: string;
  cardanoTtlOffset: number | null;
}

export enum POPULAR_CARDANO_ERROR_PHRASE {
  NOT_MATCH_MIN_AMOUNT = 'less than the minimum UTXO value',
  INSUFFICIENT_INPUT = 'Insufficient input in transaction'
}

export function getFirstNumberAfterSubstring (inputStr: string, subStr: string) {
  const regex = new RegExp(`(${subStr})\\D*(\\d+)`);
  const match = inputStr.match(regex);

  if (match) {
    return parseInt(match[2], 10);
  } else {
    return null;
  }
}

export function toUnit (balance: number, decimals: number) {
  if (balance === 0) {
    return 0;
  }

  return balance / (10 ** decimals);
}
