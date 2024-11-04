// [object Object]
// SPDX-License-Identifier: Apache-2.0

import { MultiChainAssetMap } from '@subwallet/chain-list';
import { _ChainAsset, _ChainInfo, _MultiChainAsset } from '@subwallet/chain-list/types';
import { ChainService, filterAssetInfoMap } from '@subwallet/extension-base/services/chain-service';
import { LATEST_CHAIN_DATA_FETCHING_INTERVAL } from '@subwallet/extension-base/services/chain-service/constants';
import { fetchPatchData, PatchInfo } from '@subwallet/extension-base/services/chain-service/utils';
import { EventService } from '@subwallet/extension-base/services/event-service';
import { Md5 } from 'ts-md5';

export class ChainOnlineService {
  private chainService: ChainService;
  private eventService: EventService;

  refreshLatestChainDataTimeOut: NodeJS.Timer | undefined;
  private patchVersion = '';

  constructor (chainService: ChainService, eventService: EventService) {
    this.chainService = chainService;
    this.eventService = eventService;
  }

  md5Hash (data: any) {
    return Md5.hashStr(JSON.stringify(data));
  }

  validatePatchWithHash (latestPatch: PatchInfo) {
    const { ChainAsset, ChainAssetHashMap, ChainInfo, ChainInfoHashMap, MultiChainAsset, MultiChainAssetHashMap } = latestPatch;

    for (const [chainSlug, chain] of Object.entries(ChainInfo)) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { chainStatus, providers, ...chainWithoutProvidersAndStatus } = chain;

      if (this.md5Hash(chainWithoutProvidersAndStatus) !== ChainInfoHashMap[chainSlug]) {
        return false;
      }
    }

    for (const [assetSlug, asset] of Object.entries(ChainAsset)) {
      if (this.md5Hash(asset) !== ChainAssetHashMap[assetSlug]) {
        return false;
      }
    }

    for (const [mAssetSlug, mAsset] of Object.entries(MultiChainAsset)) {
      if (this.md5Hash(mAsset) !== MultiChainAssetHashMap[mAssetSlug]) {
        return false;
      }
    }

    return true;
  }

  validatePatchBeforeStore (candidateChainInfoMap: Record<string, _ChainInfo>, candidateAssetRegistry: Record<string, _ChainAsset>, candidateMultiChainAssetMap: Record<string, _MultiChainAsset>, latestPatch: PatchInfo) {
    for (const [chainSlug, chainHash] of Object.entries(latestPatch.ChainInfoHashMap)) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { chainStatus, providers, ...chainWithoutProvidersAndStatus } = candidateChainInfoMap[chainSlug];

      if (this.md5Hash(chainWithoutProvidersAndStatus) !== chainHash) {
        return false;
      }
    }

    for (const [assetSlug, assetHash] of Object.entries(latestPatch.ChainAssetHashMap)) {
      if (!candidateAssetRegistry[assetSlug]) {
        if (latestPatch.)
      }

      if (this.md5Hash(candidateAssetRegistry[assetSlug]) !== assetHash) {
        return false;
      }
    }

    console.log('b');

    for (const [mAssetSlug, mAssetHash] of Object.entries(latestPatch.MultiChainAssetHashMap)) {
      if (this.md5Hash(candidateMultiChainAssetMap[mAssetSlug]) !== mAssetHash) {
        return false;
      }
    }

    console.log('c');

    return true;
  }

  handleLatestPatch (latestPatch: PatchInfo) {
    try {
      // 1. validate fetch data with its hash
      const isSafePatch = this.validatePatchWithHash(latestPatch);
      const { ChainAsset: latestAssetInfo, ChainInfo: latestChainInfo, MultiChainAsset: latestMultiChainAsset, patchVersion } = latestPatch;
      let chainInfoMap = {};
      let assetRegistry = {};
      let multiChainAssetMap = {};
      // todo: AssetLogoMap, ChainLogoMap
      console.log('[i] isSafePatch', isSafePatch)
      console.log('[i] latestPatch', latestPatch)

      if (isSafePatch && this.patchVersion !== patchVersion) {
        // 2. merge data map
        if (latestChainInfo && Object.keys(latestChainInfo).length > 0) {
          chainInfoMap = Object.assign({}, this.chainService.getChainInfoMap(), latestChainInfo);
        }

        console.log('[i] done chain')

        if (latestAssetInfo && Object.keys(latestAssetInfo).length > 0) {
          assetRegistry = filterAssetInfoMap(this.chainService.getChainInfoMap(), Object.assign({}, this.chainService.getAssetRegistry(), latestAssetInfo));
        }

        console.log('[i] done asset')

        if (latestMultiChainAsset && Object.keys(latestMultiChainAsset).length > 0) {
          multiChainAssetMap = { ...MultiChainAssetMap, ...latestMultiChainAsset };
        }

        console.log('[i] done multi asset')

        // 3. validate data before write
        const isCorrectPatch = this.validatePatchBeforeStore(chainInfoMap, assetRegistry, multiChainAssetMap, latestPatch);
        console.log('[i] isCorrectPatch', isCorrectPatch)

        // 4. write to subject
        if (isCorrectPatch) {
          this.chainService.setChainInfoMap(chainInfoMap);
          this.chainService.subscribeChainInfoMap().next(chainInfoMap);

          this.chainService.setAssetRegistry(assetRegistry);
          this.chainService.subscribeAssetRegistry().next(assetRegistry);
          this.chainService.autoEnableTokens()
            .then(() => {
              this.eventService.emit('asset.updateState', '');
            })
            .catch(console.error);

          this.chainService.subscribeMultiChainAssetMap().next(multiChainAssetMap);
          this.patchVersion = patchVersion;
        }
      }
    } catch (e) {
      console.error('Error fetching latest patch data');
    }

    this.eventService.emit('asset.online.ready', true);
  }

  private async fetchLatestPatchData () {
    return await fetchPatchData<PatchInfo>('data.json');
  }

  handleLatestData () {
    this.fetchLatestPatchData().then((latestPatch) => {
      if (latestPatch) {
        this.eventService.waitAssetReady
          .then(() => {
            this.handleLatestPatch(latestPatch);
          })
          .catch(console.error);
      }
    }).catch(console.error);
  }

  checkLatestData () {
    clearInterval(this.refreshLatestChainDataTimeOut);
    this.handleLatestData();

    this.refreshLatestChainDataTimeOut = setInterval(this.handleLatestData.bind(this), LATEST_CHAIN_DATA_FETCHING_INTERVAL);
  }
}
