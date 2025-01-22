// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

// TODO: NEED TO UPDATE THIS INTERFACE
import { fetchUnsignedPayload } from '@subwallet/subwallet-api-sdk/cardano';
import { BuildCardanoTxParams } from '@subwallet/subwallet-api-sdk/cardano/utils';

export interface SubWalletResponse<T> {
  statusCode: number, // todo: better to use a flag status than status code
  result: T,
  message: string
}

export class SubWalletApiSdk {
  private baseUrl = '';
  private static _instance: SubWalletApiSdk | undefined = undefined;

  public init (url: string) {
    this.baseUrl = url;
  }

  async fetchUnsignedPayload (params: BuildCardanoTxParams): Promise<string> {
    const url = `${this.baseUrl}/build-cardano-tx?`;

    return fetchUnsignedPayload(url, params);
  }

  static instance () {
    if (this._instance) {
      return this._instance;
    }

    this._instance = new SubWalletApiSdk();

    return this._instance;
  }
}
