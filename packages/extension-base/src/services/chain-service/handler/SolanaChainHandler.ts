// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ChainService } from '@subwallet/extension-base/services/chain-service';
import { AbstractChainHandler } from '@subwallet/extension-base/services/chain-service/handler/AbstractChainHandler';
import { SolanaApi } from '@subwallet/extension-base/services/chain-service/handler/SolanaApi';
import { _ApiOptions } from '@subwallet/extension-base/services/chain-service/handler/types';

export class SolanaChainHandler extends AbstractChainHandler {
  private solanaApiMap: Record<string, SolanaApi> = {};

  // eslint-disable-next-line no-useless-constructor
  constructor (parent?: ChainService) {
    super(parent);
  }

  getApiByChain (chain: string) {
    return this.solanaApiMap[chain];
  }

  getSolanaApiMap () {
    return this.solanaApiMap;
  }

  setSolanaApi (chain: string, api: SolanaApi) {
    this.solanaApiMap[chain] = api;
  }

  destroySolanaApi (chain: string) {
    const api = this.solanaApiMap[chain];

    api.disconnect().then(() => {
      delete this.solanaApiMap[chain];
    }).catch(console.error);
  }

  async initApi (chainSlug: string, apiUrl: string, { onUpdateStatus }: Omit<_ApiOptions, 'metadata'>) {
    const existed = this.getApiByChain(chainSlug);

    if (existed) {
      existed.connect();

      if (apiUrl !== existed.apiUrl) {
        existed.updateApiUrl(apiUrl).catch(console.error);
      }

      return existed;
    }

    const api = new SolanaApi(chainSlug, apiUrl);

    api.isApiConnectedSubject.subscribe(this.handleConnect.bind(this, chainSlug));
    api.isApiConnectedSubject.subscribe(onUpdateStatus);

    return Promise.resolve(api);
  }

  async recoverApi (chainSlug: string) {
    const api = this.solanaApiMap[chainSlug];

    await api.recoverConnect();
  }

  sleep (): Promise<void> {
    this.isSleeping = true;
    this.cancelAllRecover();

    Object.keys(this.solanaApiMap).forEach((key) => {
      delete this.solanaApiMap[key];
    });

    return Promise.resolve();
  }

  wakeUp (): Promise<void> {
    this.isSleeping = false;
    const activeChains = this.parent?.getActiveChains() || [];

    for (const chain of activeChains) {
      const solanaApi = this.getApiByChain(chain);

      solanaApi?.connect();
    }

    return Promise.resolve();
  }
}
