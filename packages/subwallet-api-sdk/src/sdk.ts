// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

export interface CardanoTransactionConfigProps {
  cardanoId: string;
  from: string;
  to: string;
  value: string;
  cardanoTtlOffset: number | null;
}

// TODO: NEED TO UPDATE THIS INTERFACE
interface SubWalletResponse<T> {
  statusCode: number, // todo: better to use a flag status than status code
  result: T,
  message: string
}

type SWFetchCardanoTx = SubWalletResponse<string>;

export class SubWalletApiSdk {
  private baseUrl = '';

  public init (url: string) {
    this.baseUrl = url;
  }

  async fetchUnsignedPayload (params: CardanoTransactionConfigProps): Promise<string> {
    const cardanoId = params.cardanoId;

    if (!cardanoId) {
      throw new Error('Missing token policy id metadata');
    }

    const url = `${this.baseUrl}/cardano/build-cardano-tx?`;
    const searchParams = new URLSearchParams({
      sender: params.from,
      receiver: params.to,
      unit: cardanoId,
      quantity: params.value,
    });

    if (params.cardanoTtlOffset) {
      searchParams.append('ttl', params.cardanoTtlOffset.toString());
    }

    try {
      const rawResponse = await fetch(url + searchParams.toString(), {
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
}
