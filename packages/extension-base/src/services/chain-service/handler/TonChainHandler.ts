// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ChainService } from '@subwallet/extension-base/services/chain-service';
import { AbstractChainHandler } from '@subwallet/extension-base/services/chain-service/handler/AbstractChainHandler';
import { TonApi } from '@subwallet/extension-base/services/chain-service/handler/TonApi';

import { logger as createLogger } from '@polkadot/util/logger';
import { Logger } from '@polkadot/util/types';

export class TonChainHandler extends AbstractChainHandler {
  private tonApiMap: Record<string, TonApi> = {};
  private logger: Logger;

  constructor (parent?: ChainService) {
    super(parent);
    this.logger = createLogger('ton-chain-handler');
  }

  public getTonApiMap () {
    return this.tonApiMap;
  }

  public getTonApiByChain (chain: string) {
    return this.tonApiMap[chain];
  }

  public getApiByChain (chain: string) {
    return this.getTonApiByChain(chain);
  }

  public setTonApi (chain: string, tonApi: TonApi) {
    this.tonApiMap[chain] = tonApi;
  }

  public initApi () {

  }

  public recoverApi (chain: string) {
    const existed = this.getTonApiByChain(chain);

    if (existed && !existed.isApiReadyOnce) {
      console.log(`Reconnect ${existed.providerName || existed.chainSlug} at ${existed.apiUrl}`);

      return existed.recoverConnect();
    }
  }
}
