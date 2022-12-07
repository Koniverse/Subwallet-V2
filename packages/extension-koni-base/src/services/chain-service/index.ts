// Copyright 2019-2022 @subwallet/extension-koni-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AssetRef, Chain, ChainAsset, ChainProvider, EvmChain, MultiChainAsset, SubstrateChain } from '@subwallet/extension-koni-base/services/chain-list';
import { _ChainAssetWrapper, _ChainProviderWrapper, _ChainWrapper, _DataMap } from '@subwallet/extension-koni-base/services/chain-service/types';

import { logger as createLogger } from '@polkadot/util/logger';
import { Logger } from '@polkadot/util/types';

const DEFAULT_NETWORK = [
  'polkadot/substrate',
  'kusama/substrate'
];

export class ChainService {
  private dataMap: _DataMap = {
    assetRef: {},
    chain: {},
    chainAsset: {},
    chainProvider: {},
    evmChain: {},
    multiChainAsset: {},
    substrateChain: {}
  };

  private logger: Logger;

  constructor () {
    this.dataMap.chain = Chain as Record<string, _ChainWrapper>;
    this.dataMap.chainAsset = ChainAsset as Record<string, _ChainAssetWrapper>;
    this.dataMap.chainProvider = ChainProvider as Record<number, _ChainProviderWrapper>;
    this.dataMap.multiChainAsset = MultiChainAsset;
    this.dataMap.assetRef = AssetRef;
    this.dataMap.evmChain = EvmChain;
    this.dataMap.substrateChain = SubstrateChain;

    this.logger = createLogger('chain-service');
  }

  public initChainMap () {
    DEFAULT_NETWORK.forEach((slug) => {
      this.dataMap.chain[slug].active = true;
    });

    this.logger.log('Initiated with default networks');
  }

  public getChainMap () {
    return this.dataMap.chain;
  }

  public getActiveChains (): number[] {
    const activeChains: number[] = [];

    Object.values(this.dataMap.chain).forEach((chain) => {
      if (chain.active) {
        activeChains.push(chain.id_);
      }
    });

    return activeChains;
  }
}
