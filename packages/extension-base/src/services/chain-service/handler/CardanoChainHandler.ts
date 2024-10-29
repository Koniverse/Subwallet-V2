// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ChainService } from '@subwallet/extension-base/services/chain-service';
import { AbstractChainHandler } from '@subwallet/extension-base/services/chain-service/handler/AbstractChainHandler';
import { CardanoApi } from '@subwallet/extension-base/services/chain-service/handler/CardanoApi';
import { _ApiOptions } from '@subwallet/extension-base/services/chain-service/handler/types';

export class CardanoChainHandler extends AbstractChainHandler {
  private cardanoApiMap: Record<string, CardanoApi> = {};

  // eslint-disable-next-line no-useless-constructor
  constructor (parent?: ChainService) {
    super(parent);
  }

  public getCardanoApiMap () {
    return this.cardanoApiMap;
  }

  public getCardanoApiByChain (chain: string) {
    return this.cardanoApiMap[chain];
  }

  public getApiByChain (chain: string) {
    return this.getCardanoApiByChain(chain);
  }

  public setCardanoApi (chain: string, cardanoApi: CardanoApi) {
    this.cardanoApiMap[chain] = cardanoApi;
  }

  public async initApi (chainSlug: string, apiUrl: string, { isTestnet, onUpdateStatus, providerName }: Omit<_ApiOptions, 'metadata'> = {}) {
    const existed = this.getCardanoApiByChain(chainSlug);

    if (existed) {
      existed.connect();

      if (apiUrl !== existed.apiUrl) {
        existed.updateApiUrl(apiUrl).catch(console.error);
      }

      return existed;
    }

    const apiObject = new CardanoApi(chainSlug, apiUrl, { isTestnet, providerName });

    apiObject.connectionStatusSubject.subscribe(this.handleConnection.bind(this, chainSlug));
    apiObject.connectionStatusSubject.subscribe(onUpdateStatus);

    return Promise.resolve(apiObject);
  }

  public async recoverApi (chain: string): Promise<void> {
    const existed = this.getCardanoApiByChain(chain);

    if (existed && !existed.isApiReadyOnce) {
      console.log(`Reconnect ${existed.providerName || existed.chainSlug} at ${existed.apiUrl}`);

      return existed.recoverConnect();
    }
  }

  destroyCardanoApi (chain: string) {
    const cardanoApi = this.getCardanoApiByChain(chain);

    cardanoApi?.destroy().catch(console.error);
  }

  async sleep () {
    this.isSleeping = true;
    this.cancelAllRecover();

    await Promise.all(Object.values(this.getCardanoApiMap()).map((cardanoApi) => {
      return cardanoApi.disconnect().catch(console.error);
    }));

    return Promise.resolve();
  }

  wakeUp () {
    this.isSleeping = false;
    const activeChains = this.parent?.getActiveChains() || [];

    for (const chain of activeChains) {
      const cardanoApi = this.getCardanoApiByChain(chain);

      cardanoApi?.connect();
    }

    return Promise.resolve();
  }
}
