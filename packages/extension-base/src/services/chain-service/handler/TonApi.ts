// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ApiOptions } from '@subwallet/extension-base/services/chain-service/handler/types';
import { _ChainConnectionStatus, _TonApi } from '@subwallet/extension-base/services/chain-service/types';
import { createPromiseHandler, PromiseHandler } from '@subwallet/extension-base/utils';
import { TonClient } from '@ton/ton';
import { BehaviorSubject } from 'rxjs';

export class TonApi implements _TonApi {
  chainSlug: string;
  api: TonClient;
  apiUrl: string;
  apiError?: string;
  apiRetry = 0;
  public readonly isApiConnectedSubject = new BehaviorSubject(false);
  public readonly connectionStatusSubject = new BehaviorSubject(_ChainConnectionStatus.DISCONNECTED);
  isApiReady = false;
  isApiReadyOnce = false;
  isReadyHandler: PromiseHandler<_TonApi>;

  providerName: string;

  constructor (chainSlug: string, apiUrl: string, { providerName }: _ApiOptions) {
    this.chainSlug = chainSlug;
    this.apiUrl = apiUrl;
    this.providerName = providerName || 'unknown';
    this.api = this.createProvider(apiUrl);
    this.isReadyHandler = createPromiseHandler<_TonApi>();

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

  get isReady (): Promise<_TonApi> {
    return this.isReadyHandler.promise;
  }

  async updateApiUrl (apiUrl: string) {
    if (this.apiUrl === apiUrl) {
      return;
    }

    await this.disconnect();

    // Create new provider and api
    this.apiUrl = apiUrl;
    this.api = new TonClient({ endpoint: this.apiUrl });
  }

  async recoverConnect () {
    await this.disconnect();
    this.connect();
    // alibaba
  }

  private createProvider (apiUrl: string) { // alibaba
    return new TonClient({ endpoint: apiUrl });
  }

  connect (): void {
    // alibaba.
    // There isn't a persistent network connection underlying TonClient. Cant check connection status.
    this.isApiReadyOnce = true;
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
      console.warn(`Disconnected from ${this.chainSlug} of ${this.apiUrl} (TON)`);
      this.isApiReady = false;
      this.isReadyHandler = createPromiseHandler<_TonApi>();
    }
  }
}
