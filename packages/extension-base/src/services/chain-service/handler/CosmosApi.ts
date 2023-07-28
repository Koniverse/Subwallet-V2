// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { StargateClient } from '@cosmjs/stargate';
import { Tendermint34Client, TendermintClient } from '@cosmjs/tendermint-rpc';
import { _CosmosInfo } from '@subwallet/chain-list/types';
import { _CosmosApi } from '@subwallet/extension-base/services/chain-service/types';
import { createPromiseHandler, PromiseHandler } from '@subwallet/extension-base/utils/promise';
import { BehaviorSubject } from 'rxjs';

export class CosmosApi implements _CosmosApi {
  api: StargateClient;
  apiUrl: string;
  chainSlug: string;

  tendermintClient: TendermintClient;
  restEndpoint: string;

  isApiReady: boolean;
  isApiReadyOnce: boolean;

  intervalCheckApi: NodeJS.Timer;
  public readonly isApiConnectedSubject = new BehaviorSubject(false);
  isReadyHandler: PromiseHandler<_CosmosApi>;

  get isReady (): Promise<_CosmosApi> {
    return this.isReadyHandler.promise;
  }

  get isApiConnected (): boolean {
    return this.isApiConnectedSubject.getValue();
  }

  private updateConnectedStatus (isConnected: boolean): void {
    if (isConnected !== this.isApiConnectedSubject.value) {
      this.isApiConnectedSubject.next(isConnected);
    }
  }

  static async create (chainSlug: string, apiProvider: string, cosmosChainInfo: _CosmosInfo): Promise<CosmosApi> {
    const tendermint = await Tendermint34Client.connect(apiProvider);
    const stargateClient = await StargateClient.create(tendermint);

    return new CosmosApi(chainSlug, apiProvider, cosmosChainInfo, stargateClient, tendermint);
  }

  protected constructor (chainSlug: string, apiProvider: string, cosmosChainInfo: _CosmosInfo, api: StargateClient, tendermint: TendermintClient) {
    this.chainSlug = chainSlug;
    this.apiUrl = apiProvider;
    this.restEndpoint = cosmosChainInfo.rest;
    this.api = api;
    this.tendermintClient = tendermint;
    this.isReadyHandler = createPromiseHandler<_CosmosApi>();

    this.intervalCheckApi = this.createIntervalCheckApi();

    // TODO: need to research Stargate package
    this.isApiReady = true;
    this.isApiReadyOnce = true;
  }

  createIntervalCheckApi () {
    this.intervalCheckApi && clearInterval(this.intervalCheckApi);

    return setInterval(() => {
      this.tendermintClient.status()
        .then((status) => {
          if (status.syncInfo.catchingUp) { // TODO: there might be a better way
            this.onConnect();
          }
        }).catch(() => {
          this.onDisconnect();
        });
    }, 10000);
  }

  connect (): void {
    console.debug('Cosmos API is connected');
  }

  destroy (): Promise<void> {
    return Promise.resolve(undefined);
  }

  disconnect (): Promise<void> {
    this.api.disconnect();

    return Promise.resolve(undefined);
  }

  async recoverConnect (): Promise<void> {
    await this.disconnect();

    const tendermint = await Tendermint34Client.connect(this.apiUrl);

    this.api = await StargateClient.create(tendermint);
    this.tendermintClient = tendermint;

    await this.isReadyHandler.promise;
  }

  async updateApiUrl (apiUrl: string): Promise<void> {
    if (apiUrl === this.apiUrl) {
      return;
    }

    await this.disconnect();

    this.apiUrl = apiUrl;
    const tendermint = await Tendermint34Client.connect(this.apiUrl);

    this.api = await StargateClient.create(tendermint);
    this.tendermintClient = tendermint;
  }

  onConnect () {
    if (!this.isApiConnected) {
      console.log(`Connected to ${this.chainSlug} at ${this.apiUrl}`);
      this.isApiReady = true;
    }

    if (this.isApiReadyOnce) {
      this.isReadyHandler.resolve(this);
    }

    this.updateConnectedStatus(true);
  }

  onDisconnect () {
    this.updateConnectedStatus(false);

    if (this.isApiConnected) {
      console.warn(`Disconnected from ${this.chainSlug} of ${this.apiUrl} (Cosmos)`);
      this.isApiReady = false;
      this.isReadyHandler = createPromiseHandler<_CosmosApi>();
    }
  }
}
