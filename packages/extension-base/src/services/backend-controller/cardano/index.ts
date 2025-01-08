// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { CardanoTransactionConfigProps } from '@subwallet/extension-base/services/balance-service/transfer/cardano-transfer';

export const SUBWALLET_API = process.env.SUBWALLET_API || '';

export async function fetchUnsignedPayload (params: CardanoTransactionConfigProps): Promise<string> {
  const cardanoId = params.tokenInfo.metadata?.cardanoId;

  if (!cardanoId) {
    throw new Error('Missing token policy id metadata');
  }

  try {
    const url = `${SUBWALLET_API}/build-cardano-tx?`;
    const searchParamsUrl = new URLSearchParams({
      sender: params.from,
      receiver: params.to,
      unit: cardanoId,
      quantity: params.value,
      ttl: params.cardanoTtlOffset.toString()
    }).toString();

    const rawResponse = await fetch(url + searchParamsUrl, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const response = await rawResponse.json() as { result: string };

    return response.result;
  } catch (error) {
    throw new Error('Transaction is not built successfully.');
  }
}
