// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { CardanoAddressBalance, CardanoBalanceItem } from '@subwallet/extension-base/services/balance-service/helpers/subscribe/cardano/types';
import { _ApiOptions } from '@subwallet/extension-base/services/chain-service/handler/types';
import { _CardanoApi, _ChainConnectionStatus } from '@subwallet/extension-base/services/chain-service/types';
import { createPromiseHandler, PromiseHandler } from '@subwallet/extension-base/utils';
import { BehaviorSubject } from 'rxjs';

export const API_KEY = {
  mainnet: 'mainnet6uE9JH3zGYquaxRKA7IMhEuzRUB58uGK',
  testnet: 'preprodcnP5RADcrWMlf2cQe4ZKm4cjRvrBQFXM'
};

export class CardanoApi implements _CardanoApi {
  chainSlug: string;
  // private api: BlockFrostAPI;
  apiUrl: string;
  apiError?: string;
  apiRetry = 0;
  public readonly isApiConnectedSubject = new BehaviorSubject(false);
  public readonly connectionStatusSubject = new BehaviorSubject(_ChainConnectionStatus.DISCONNECTED);
  isApiReady = false;
  isApiReadyOnce = false;
  isReadyHandler: PromiseHandler<_CardanoApi>;
  isTestnet: boolean; // todo: add api with interface BlockFrostAPI to remove isTestnet check

  providerName: string;

  constructor (chainSlug: string, apiUrl: string, { isTestnet, providerName }: _ApiOptions) {
    this.chainSlug = chainSlug;
    this.apiUrl = apiUrl;
    this.isTestnet = isTestnet ?? true;
    this.providerName = providerName || 'unknown';
    // this.api = this.createProvider(isTestnet);
    this.isReadyHandler = createPromiseHandler<_CardanoApi>();

    this.connect();
  }

  get isApiConnected (): boolean {
    return this.isApiConnectedSubject.getValue();
  }

  get connectionStatus (): _ChainConnectionStatus {
    return this.connectionStatusSubject.getValue();
  }

  private updateConnectionStatus (status: _ChainConnectionStatus): void {
    const isConnected = status === _ChainConnectionStatus.CONNECTED;

    if (isConnected !== this.isApiConnectedSubject.value) {
      this.isApiConnectedSubject.next(isConnected);
    }

    if (status !== this.connectionStatusSubject.value) {
      this.connectionStatusSubject.next(status);
    }
  }

  get isReady (): Promise<_CardanoApi> {
    return this.isReadyHandler.promise;
  }

  async updateApiUrl (apiUrl: string) {
    if (this.apiUrl === apiUrl) {
      return;
    }

    await this.disconnect();

    this.apiUrl = apiUrl;
    // this.api = this.createProvider();
  }

  async recoverConnect () {
    await this.disconnect();
    this.connect();

    await this.isReadyHandler.promise;
  }

  // private createProvider (isTestnet = true): BlockFrostAPI {
  //   const projectId = isTestnet ? API_KEY.testnet : API_KEY.mainnet;
  //
  //   return new BlockFrostAPI({
  //     projectId
  //   });
  // }

  connect (): void {
    this.updateConnectionStatus(_ChainConnectionStatus.CONNECTING);
    // There isn't a persistent network connection underlying TonClient. Cant check connection status.
    // this.isApiReadyOnce = true;
    this.onConnect();
  }

  async disconnect () {
    this.onDisconnect();
    this.updateConnectionStatus(_ChainConnectionStatus.DISCONNECTED);

    return Promise.resolve();
  }

  destroy () {
    // Todo: implement this in the future
    return this.disconnect();
  }

  onConnect (): void {
    if (!this.isApiConnected) {
      console.log(`Connected to ${this.chainSlug} at ${this.apiUrl}`);
      this.isApiReady = true;

      if (this.isApiReadyOnce) {
        this.isReadyHandler.resolve(this);
      }
    }

    this.updateConnectionStatus(_ChainConnectionStatus.CONNECTED);
  }

  onDisconnect (): void {
    this.updateConnectionStatus(_ChainConnectionStatus.DISCONNECTED);

    if (this.isApiConnected) {
      console.warn(`Disconnected from ${this.chainSlug} of ${this.apiUrl}`);
      this.isApiReady = false;
      this.isReadyHandler = createPromiseHandler<_CardanoApi>();
    }
  }

  async getBalanceMap (address: string): Promise<CardanoBalanceItem[]> {
    try {
      const url = this.isTestnet ? `https://cardano-preprod.blockfrost.io/api/v0/addresses/${address}` : `https://cardano-mainnet.blockfrost.io/api/v0/addresses/${address}`;
      const projectId = this.isTestnet ? API_KEY.testnet : API_KEY.mainnet;
      const response = await fetch(
        url, {
          method: 'GET',
          headers: {
            'Project_id': projectId
          }
        }
      )

      const addressBalance = await response.json() as CardanoAddressBalance;

      return addressBalance.amount;
    } catch (error) {
      console.error(error);

      return [];
    }
  }
}
