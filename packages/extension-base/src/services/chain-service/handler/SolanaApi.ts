// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Commitment, Connection, ConnectionConfig } from '@solana/web3.js';
import { _DEFAULT_SOLANA_COMMITMENT } from '@subwallet/extension-base/services/chain-service/constants';
import { _ApiOptions } from '@subwallet/extension-base/services/chain-service/handler/types';
import { _SolanaApi } from '@subwallet/extension-base/services/chain-service/types';
import { createPromiseHandler, PromiseHandler } from '@subwallet/extension-base/utils/promise';
import { BehaviorSubject } from 'rxjs';

export class SolanaApi implements _SolanaApi {
  api: Connection;
  apiUrl: string;
  chainSlug: string;

  isReadyHandler: PromiseHandler<_SolanaApi>;

  isApiConnectedSubject: BehaviorSubject<boolean> = new BehaviorSubject(false);
  isApiReady = false;
  isApiReadyOnce = false;

  commitment: Commitment | ConnectionConfig = _DEFAULT_SOLANA_COMMITMENT;

  get isReady (): Promise<_SolanaApi> {
    return this.isReadyHandler.promise;
  }

  get isApiConnected (): boolean {
    return this.isApiConnectedSubject.getValue();
  }

  constructor (chainSlug: string, apiUrl: string, { solanaCommitment }: _ApiOptions = {}) {
    this.chainSlug = chainSlug;
    this.apiUrl = apiUrl;
    this.commitment = solanaCommitment || _DEFAULT_SOLANA_COMMITMENT;
    this.api = new Connection(apiUrl, this.commitment);
    this.isReadyHandler = createPromiseHandler<_SolanaApi>();

    this.isApiReadyOnce = true;
    this.isApiReady = true;
    this.isReadyHandler.resolve(this);

    this.updateConnectedStatus(true);
  }

  connect (): void {
    this.api = new Connection(this.apiUrl, this.commitment);

    this.isApiReadyOnce = true;
    this.isApiReady = true;
    this.isReadyHandler.resolve(this);

    this.updateConnectedStatus(true);
    console.debug('Solana API is connected');
  }

  destroy (): Promise<void> {
    return Promise.resolve(undefined);
  }

  disconnect (): Promise<void> {
    return Promise.resolve(undefined);
  }

  async recoverConnect (): Promise<void> {
    await this.disconnect();

    this.api = new Connection(this.apiUrl, this.commitment);
  }

  async updateApiUrl (apiUrl: string): Promise<void> {
    this.apiUrl = apiUrl;

    await this.disconnect();
    this.api = new Connection(apiUrl, this.commitment);
    this.connect();

    return Promise.resolve(undefined);
  }

  private updateConnectedStatus (isConnected: boolean): void {
    if (isConnected !== this.isApiConnectedSubject.value) {
      this.isApiConnectedSubject.next(isConnected);
    }
  }
}
