// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { CardanoTransactionConfigProps } from '@subwallet/extension-base/services/balance-service/transfer/cardano-transfer';

export const SUBWALLET_API = process.env.SUBWALLET_API || '';

interface SubWalletResponse<T> {
  statusCode: number, // todo: better to use a flag status than status code
  result: T,
  message: string
}

type SWFetchCardanoTx = SubWalletResponse<string>;

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

    throw new Error(`Transaction is not built successfully: ${errorMessage}`);
  }
}
