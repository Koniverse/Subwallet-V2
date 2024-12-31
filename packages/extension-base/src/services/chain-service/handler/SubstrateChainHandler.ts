// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { GearApi } from '@gear-js/api';
import { _AssetType } from '@subwallet/chain-list/types';
import { getDefaultWeightV2 } from '@subwallet/extension-base/koni/api/contract-handler/wasm/utils';
import { ChainService } from '@subwallet/extension-base/services/chain-service';
import { AbstractChainHandler } from '@subwallet/extension-base/services/chain-service/handler/AbstractChainHandler';
import { SubstrateApi } from '@subwallet/extension-base/services/chain-service/handler/SubstrateApi';
import { _ApiOptions, _SubstrateChainSpec } from '@subwallet/extension-base/services/chain-service/handler/types';
import { _SmartContractTokenInfo, _SubstrateApi } from '@subwallet/extension-base/services/chain-service/types';
import { cacheMetadata, GEAR_DEFAULT_ADDRESS, getGRC20ContractPromise, getVFTContractPromise } from '@subwallet/extension-base/utils';

import { ApiPromise } from '@polkadot/api';
import { ContractPromise } from '@polkadot/api-contract';
import { Registry } from '@polkadot/types/types';
import { BN } from '@polkadot/util';
import { logger as createLogger } from '@polkadot/util/logger';
import { Logger } from '@polkadot/util/types';

import { _PSP22_ABI, _PSP34_ABI } from '../../../koni/api/contract-handler/utils';

export const DEFAULT_AUX = ['Aux1', 'Aux2', 'Aux3', 'Aux4', 'Aux5', 'Aux6', 'Aux7', 'Aux8', 'Aux9'];

interface AssetMetadata {
  name: string,
  symbol: string,
  decimals: number
}

export class SubstrateChainHandler extends AbstractChainHandler {
  private substrateApiMap: Record<string, _SubstrateApi> = {};

  private logger: Logger;

  constructor (parent?: ChainService) {
    super(parent);
    this.logger = createLogger('substrate-chain-handler');
  }

  public getSubstrateApiMap () {
    return this.substrateApiMap;
  }

  public getSubstrateApiByChain (chainSlug: string) {
    return this.substrateApiMap[chainSlug];
  }

  public getApiByChain (chain: string) {
    return this.getSubstrateApiByChain(chain);
  }

  public async wakeUp () {
    this.isSleeping = false;
    const activeChains = this.parent?.getActiveChains() || [];

    for (const chain of activeChains) {
      const api = this.getSubstrateApiByChain(chain);

      // Not found substrateInterface mean it active with evm interface
      if (api) {
        api.connect();

        if (!api.useLightClient) {
          // Manual fire handle connect to avoid some chain can not reconnect
          setTimeout(() => {
            this.handleConnection(chain, api.connectionStatus);
          }, 10000);
        }
      }
    }

    return Promise.resolve();
  }

  public async sleep () {
    this.isSleeping = true;
    this.cancelAllRecover();

    await Promise.all(Object.values(this.getSubstrateApiMap()).map((substrateApi) => {
      return substrateApi.disconnect().catch(console.error);
    }));
  }

  async recoverApi (chainSlug: string) {
    const existed = this.getSubstrateApiByChain(chainSlug);

    if (existed && !existed.isApiReadyOnce) {
      console.log(`Reconnect ${existed.providerName || existed.chainSlug} at ${existed.apiUrl}`);

      return existed.recoverConnect();
    }
  }

  public async getChainSpec (substrateApi: _SubstrateApi) {
    const result: _SubstrateChainSpec = {
      addressPrefix: -1,
      decimals: 0,
      existentialDeposit: '',
      genesisHash: await substrateApi.makeRpcQuery<`0x${string}`>({ section: 'genesisHash' }),
      name: '',
      symbol: '',
      paraId: null
    };

    const { chainDecimals, chainTokens } = await substrateApi.makeRpcQuery<Registry>({ section: 'registry' });

    result.paraId = await substrateApi.makeRpcQuery<number | null>({ section: 'query', module: 'parachainInfo', method: 'parachainId' });

    // get first token by default, might change
    result.name = await substrateApi.makeRpcQuery<string>({ section: 'rpc', module: 'system', method: 'chain' });
    result.symbol = chainTokens[0];
    result.decimals = chainDecimals[0];
    result.addressPrefix = await substrateApi.makeRpcQuery<number>({ section: 'consts', module: 'system', method: 'ss58Prefix' });
    result.existentialDeposit = await substrateApi.makeRpcQuery<string>({ section: 'consts', module: 'balances', method: 'existentialDeposit' });

    return result;
  }

  private async getPsp22TokenInfo (apiPromise: ApiPromise, contractAddress: string, contractCaller?: string): Promise<_SmartContractTokenInfo> {
    const tokenContract = new ContractPromise(apiPromise, _PSP22_ABI, contractAddress);
    const tokenSmartContract: _SmartContractTokenInfo = {
      name: '',
      decimals: -1,
      symbol: '',
      contractError: false
    };

    const [nameResp, symbolResp, decimalsResp] = await Promise.all([
      tokenContract.query['psp22Metadata::tokenName'](contractCaller || contractAddress, { gasLimit: getDefaultWeightV2(apiPromise) }), // read-only operation so no gas limit
      tokenContract.query['psp22Metadata::tokenSymbol'](contractCaller || contractAddress, { gasLimit: getDefaultWeightV2(apiPromise) }),
      tokenContract.query['psp22Metadata::tokenDecimals'](contractCaller || contractAddress, { gasLimit: getDefaultWeightV2(apiPromise) })
    ]);

    if (!(nameResp.result.isOk && symbolResp.result.isOk && decimalsResp.result.isOk) || !nameResp.output || !decimalsResp.output || !symbolResp.output) {
      tokenSmartContract.contractError = true;

      return tokenSmartContract;
    } else {
      const symbolObj = symbolResp.output?.toHuman() as Record<string, any>;
      const decimalsObj = decimalsResp.output?.toHuman() as Record<string, any>;
      const nameObj = nameResp.output?.toHuman() as Record<string, any>;

      tokenSmartContract.name = nameResp.output ? (nameObj.Ok as string || nameObj.ok as string) : '';
      tokenSmartContract.decimals = decimalsResp.output ? (new BN((decimalsObj.Ok || decimalsObj.ok) as string | number)).toNumber() : 0;
      tokenSmartContract.symbol = decimalsResp.output ? (symbolObj.Ok as string || symbolObj.ok as string) : '';

      if (!tokenSmartContract.name || !tokenSmartContract.symbol || typeof tokenSmartContract.name === 'object' || typeof tokenSmartContract.symbol === 'object') {
        tokenSmartContract.contractError = true;
      }

      return tokenSmartContract;
    }
  }

  private async getPsp34TokenInfo (apiPromise: ApiPromise, contractAddress: string, contractCaller?: string): Promise<_SmartContractTokenInfo> {
    const tokenContract = new ContractPromise(apiPromise, _PSP34_ABI, contractAddress);
    const tokenSmartContract: _SmartContractTokenInfo = {
      name: '',
      decimals: -1,
      symbol: '',
      contractError: false
    };

    const collectionIdResp = await tokenContract.query['psp34::collectionId'](contractCaller || contractAddress, { gasLimit: getDefaultWeightV2(apiPromise) }); // read-only operation so no gas limit

    if (!collectionIdResp.result.isOk || !collectionIdResp.output) {
      tokenSmartContract.contractError = true;

      return tokenSmartContract;
    } else {
      const collectionIdDict = collectionIdResp.output?.toHuman() as Record<string, string>;

      if (collectionIdDict.Bytes === '') {
        tokenSmartContract.contractError = true;
      }

      return tokenSmartContract;
    }
  }

  private async getVaraFungibleTokenInfo (apiPromise: ApiPromise, contractAddress: string, tokenType: _AssetType): Promise<_SmartContractTokenInfo> {
    const tokenSmartContract: _SmartContractTokenInfo = {
      name: '',
      decimals: -1,
      symbol: '',
      contractError: false
    };

    if (!(apiPromise instanceof GearApi)) {
      if (tokenType === _AssetType.GRC20) {
        console.warn('Cannot subscribe GRC20 balance without GearApi instance');
      } else if (tokenType === _AssetType.VFT) {
        console.warn('Cannot subscribe VFT balance without GearApi instance');
      }

      tokenSmartContract.contractError = true;

      return tokenSmartContract;
    }

    const tokenContract = tokenType === _AssetType.GRC20 ? getGRC20ContractPromise(apiPromise, contractAddress) : getVFTContractPromise(apiPromise, contractAddress);

    const [nameRes, symbolRes, decimalsRes] = await Promise.all([
      tokenContract.service.name(GEAR_DEFAULT_ADDRESS),
      tokenContract.service.symbol(GEAR_DEFAULT_ADDRESS),
      tokenContract.service.decimals(GEAR_DEFAULT_ADDRESS)
    ]);

    const decimals = parseInt(decimalsRes.toString());

    tokenSmartContract.name = nameRes;
    tokenSmartContract.decimals = decimals;
    tokenSmartContract.symbol = symbolRes;

    if (!nameRes || !symbolRes) {
      tokenSmartContract.contractError = true;
    }

    return tokenSmartContract;
  }

  private async getLocalTokenInfo (apiPromise: ApiPromise, assetId: string): Promise<[string, number, string, boolean]> {
    const _metadata = await apiPromise.query.assets.metadata(assetId);

    const metadata = _metadata.toPrimitive() as unknown as AssetMetadata;

    let idError = false;

    if (!metadata.name || !metadata.symbol) {
      idError = true;
    }

    return [metadata.name, metadata.decimals, metadata.symbol, idError];
  }

  public async getSubstrateContractTokenInfo (contractAddress: string, tokenType: _AssetType, originChain: string, contractCaller?: string): Promise<_SmartContractTokenInfo> {
    // todo: improve this funtion later

    let tokenSmartContract: _SmartContractTokenInfo = {
      name: '',
      decimals: -1,
      symbol: '',
      contractError: false
    };

    const apiPromise = this.getSubstrateApiByChain(originChain).api;

    try {
      switch (tokenType) {
        case _AssetType.PSP22:
          tokenSmartContract = await this.getPsp22TokenInfo(apiPromise, contractAddress, contractCaller);
          break;
        case _AssetType.PSP34:
          tokenSmartContract = await this.getPsp34TokenInfo(apiPromise, contractAddress, contractCaller);
          break;
        case _AssetType.GRC20:
          tokenSmartContract = await this.getVaraFungibleTokenInfo(apiPromise, contractAddress, tokenType);
          break;
        case _AssetType.VFT:
          tokenSmartContract = await this.getVaraFungibleTokenInfo(apiPromise, contractAddress, tokenType);
          break;
      }

      return tokenSmartContract;
    } catch (e) {
      this.logger.error(e);
      tokenSmartContract.contractError = true;

      return tokenSmartContract;
    }
  }

  public async getSubstrateAssetIdTokenInfo (assetId: string, originChain: string): Promise<_SmartContractTokenInfo> {
    const apiPromise = this.getSubstrateApiByChain(originChain).api;

    try {
      const [name, decimals, symbol, contractError] = await this.getLocalTokenInfo(apiPromise, assetId);

      return {
        name,
        decimals,
        symbol,
        contractError
      };
    } catch (e) {
      this.logger.error(e);

      return {
        name: '',
        decimals: -1,
        symbol: '',
        contractError: true
      };
    }
  }

  public setSubstrateApi (chainSlug: string, substrateApi: _SubstrateApi) {
    this.substrateApiMap[chainSlug] = substrateApi;
  }

  public destroySubstrateApi (chainSlug: string) {
    const substrateAPI = this.substrateApiMap[chainSlug];

    substrateAPI?.destroy().catch(console.error);
  }

  public async initApi (chainSlug: string, apiUrl: string, { externalApiPromise, onUpdateStatus, providerName }: Omit<_ApiOptions, 'metadata'> = {}): Promise<_SubstrateApi> {
    const existed = this.substrateApiMap[chainSlug];

    const updateMetadata = (substrateApi: _SubstrateApi) => {
      // Update metadata to database with async methods
      cacheMetadata(chainSlug, substrateApi, this.parent);
    };

    // Return existed to avoid re-init metadata
    if (existed) {
      existed.connect();

      if (apiUrl !== existed.apiUrl) {
        await existed.updateApiUrl(apiUrl);
      }

      // Update data in case of existed api (if needed - old provider cannot connect)
      updateMetadata(existed);

      return existed;
    }

    const metadata = await this.parent?.getMetadata(chainSlug);
    const apiObject = new SubstrateApi(chainSlug, apiUrl, { providerName, metadata, externalApiPromise });

    apiObject.connectionStatusSubject.subscribe(this.handleConnection.bind(this, chainSlug));
    onUpdateStatus && apiObject.connectionStatusSubject.subscribe(onUpdateStatus);

    updateMetadata(apiObject);

    return apiObject;
  }
}
