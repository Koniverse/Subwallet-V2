// Copyright 2017-2022 @subwallet/subwallet-api-sdk authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { BuildCardanoTxParams, getFirstNumberAfterSubstring, POPULAR_CARDANO_ERROR_PHRASE, SWFetchCardanoTx, toUnit } from '@subwallet/subwallet-api-sdk/cardano/utils';

export async function fetchUnsignedPayload (baseUrl: string, params: BuildCardanoTxParams) {
  const searchParams = new URLSearchParams({
    sender: params.from,
    receiver: params.to,
    unit: params.cardanoId,
    quantity: params.value
  });

  if (params.cardanoTtlOffset) {
    searchParams.append('ttl', params.cardanoTtlOffset.toString());
  }

  try {
    const rawResponse = await fetch(baseUrl + searchParams.toString(), {
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

    if (errorMessage.includes(POPULAR_CARDANO_ERROR_PHRASE.NOT_MATCH_MIN_AMOUNT)) {
      const decimal = params.tokenDecimals;
      const minAdaRequiredRaw = getFirstNumberAfterSubstring(errorMessage, POPULAR_CARDANO_ERROR_PHRASE.NOT_MATCH_MIN_AMOUNT);
      const minAdaRequired = minAdaRequiredRaw ? toUnit(minAdaRequiredRaw, decimal) : 1;

      throw new Error(`Minimum ${minAdaRequired} ADA is required`);
    }

    if (errorMessage.includes(POPULAR_CARDANO_ERROR_PHRASE.INSUFFICIENT_INPUT)) {
      throw new Error('Not enough ADA to make this transaction');
    }

    throw new Error(`Transaction is not built successfully: ${errorMessage}`);
  }
}
