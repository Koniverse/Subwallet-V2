// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { CardanoTransactionConfigProps } from '@subwallet/extension-base/services/balance-service/transfer/cardano-transfer';
import { toUnit } from '@subwallet/extension-base/utils';

export const SUBWALLET_API = process.env.SUBWALLET_API || '';

export enum POPULAR_ERROR_PHRASE {
  NOT_MATCH_MIN_AMOUNT = 'less than the minimum UTXO value',
  INSUFFICIENT_INPUT = 'Insufficient input in transaction'
}

interface SubWalletResponse<T> {
  statusCode: number, // todo: better to use a flag status than status code
  result: T,
  message: string
}

type SWFetchCardanoTx = SubWalletResponse<string>;

function getFirstNumberAfterSubstring (inputStr: string, subStr: string) {
  const regex = new RegExp(`(${subStr})\\D*(\\d+)`);
  const match = inputStr.match(regex);

  console.log('match', match);

  if (match) {
    return parseInt(match[2], 10);
  } else {
    return null;
  }
}

export async function fetchUnsignedPayload (params: CardanoTransactionConfigProps): Promise<string> {
  const cardanoId = params.tokenInfo.metadata?.cardanoId;

  if (!cardanoId) {
    throw new Error('Missing token policy id metadata');
  }

  const url = `${SUBWALLET_API}/build-cardano-tx?`;
  const searchParamsUrl = new URLSearchParams({
    sender: params.from,
    receiver: params.to,
    unit: cardanoId,
    quantity: params.value,
    ttl: params.cardanoTtlOffset.toString()
  }).toString();

  try {
    const rawResponse = await fetch(url + searchParamsUrl, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const response = await rawResponse.json() as SWFetchCardanoTx;

    if (response.statusCode !== 200) {
      throw new Error(response.message);
    }

    return response.result;
  } catch (error) {
    const errorMessage = (error as Error).message;

    if (errorMessage.includes(POPULAR_ERROR_PHRASE.NOT_MATCH_MIN_AMOUNT)) {
      const decimal = params.tokenInfo.decimals || 0;
      const minAdaRequiredRaw = getFirstNumberAfterSubstring(errorMessage, POPULAR_ERROR_PHRASE.NOT_MATCH_MIN_AMOUNT);
      const minAdaRequired = minAdaRequiredRaw ? toUnit(minAdaRequiredRaw, decimal) : 1;

      throw new Error(`Minimum ${minAdaRequired} ADA is required`);
    }

    if (errorMessage.includes(POPULAR_ERROR_PHRASE.INSUFFICIENT_INPUT)) {
      throw new Error('Not enough ADA to make this transaction');
    }

    throw new Error(`Transaction is not built successfully: ${errorMessage}`);
  }
}
