// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _CosmosInfo } from '@subwallet/chain-list/types';
import { ChainService } from '@subwallet/extension-base/services/chain-service';
import { AbstractChainHandler } from '@subwallet/extension-base/services/chain-service/handler/AbstractChainHandler';
import { CosmosApi } from '@subwallet/extension-base/services/chain-service/handler/CosmosApi';
import { _ApiOptions } from '@subwallet/extension-base/services/chain-service/handler/types';

export class CosmosChainHandler extends AbstractChainHandler {
  private cosmosApiMap: Record<string, CosmosApi> = {};

  // eslint-disable-next-line no-useless-constructor
  constructor (parent?: ChainService) {
    super(parent);
  }

  getApiByChain (chain: string): CosmosApi | undefined {
    return this.cosmosApiMap[chain];
  }

  getCosmosApiMap () {
    return this.cosmosApiMap;
  }

  setCosmosApi (chainSlug: string, cosmosApi: CosmosApi) {
    this.cosmosApiMap[chainSlug] = cosmosApi;
  }

  async initApi (chainSlug: string, apiUrl: string, { cosmosChainInfo, onUpdateStatus }: Omit<_ApiOptions, 'metadata'>): Promise<CosmosApi> {
    const existed = this.getApiByChain(chainSlug);

    if (existed) {
      existed.connect();

      if (apiUrl !== existed.apiUrl) {
        existed.updateApiUrl(apiUrl).catch(console.error);
      }

      return Promise.resolve(existed);
    }

    const api = await CosmosApi.create(chainSlug, apiUrl, cosmosChainInfo as _CosmosInfo);

    api.isApiConnectedSubject.subscribe(this.handleConnect.bind(this, chainSlug));
    api.isApiConnectedSubject.subscribe(onUpdateStatus);

    return Promise.resolve(api);
  }

  async recoverApi (chainSlug: string): Promise<void> {
    const existed = this.getApiByChain(chainSlug);

    if (existed && !existed.isApiReadyOnce) {
      console.log(`Reconnect ${existed.chainSlug} at ${existed.apiUrl}`);

      await existed.recoverConnect();
    }
  }

  destroyCosmosApi (chain: string) {
    const cosmosApi = this.getApiByChain(chain);

    cosmosApi?.disconnect().catch(console.error);
  }

  async sleep (): Promise<void> {
    this.isSleeping = true;
    this.cancelAllRecover();

    await Promise.all(Object.values(this.getCosmosApiMap()).map((cosmosApi) => {
      return cosmosApi.disconnect().catch(console.error);
    }));

    return Promise.resolve();
  }

  wakeUp (): Promise<void> {
    this.isSleeping = false;
    const activeChains = this.parent?.getActiveChains() || [];

    for (const chain of activeChains) {
      const cosmosApi = this.getApiByChain(chain);

      cosmosApi?.connect();
    }

    return Promise.resolve();
  }
}
