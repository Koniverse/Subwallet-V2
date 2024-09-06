// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ChainInfoMap} from '@subwallet/chain-list';
import {_AssetType, _ChainAsset, _ChainInfo} from '@subwallet/chain-list/types';
import {ApiPromise, WsProvider} from '@polkadot/api';
import {chainProvider} from './constants';

jest.setTimeout(3 * 60 * 60 * 1000);

const ALL_CHAIN = [
  // 'hydradx_main','astar','hydradx_rococo'
  'astar', 'calamari', 'parallel', 'darwinia2', 'crabParachain','pangolin', 'statemint', 'moonriver', 'shiden', 'moonbeam',
  'statemine', 'liberland', 'dentnet', 'phala', 'crust', 'dbcchain', 'rococo_assethub', 'hydradx_main', 'hydradx_rococo',
  'acala', 'bifrost', 'karura', 'interlay', 'kintsugi', 'amplitude', 'mangatax_para', 'pendulum', 'pioneer'
]

type AssetQuery = {
  deposit : string | null,
  name : string,
  symbol : string,
  decimals : number,
  isFrozen : boolean,
  assetType : string,
  existentialDeposit : string | null,
  isSufficient : boolean,
  precision : number,
  minimalBalance : string | null,
  additional : {
    feePerSecond : number,
    coingeckoId : string
  }
}

interface PalletMethod {
  pallet : 'assets'|'assetRegistry'|'assetManager',
  method : 'metadata'|'assetMetadatas'|'assets',
  hasAssetId : boolean
}

const chainMap : Record<string , PalletMethod> = {
  astar : {pallet: 'assets', method:'metadata', hasAssetId : true},
  calamari: {pallet: 'assets', method:'metadata', hasAssetId : true},
  parallel: {pallet: 'assets', method:'metadata', hasAssetId : true},
  darwinia2: {pallet: 'assets', method:'metadata', hasAssetId : true},
  crabParachain: {pallet: 'assets', method:'metadata', hasAssetId : true},
  pangolin: {pallet: 'assets', method:'metadata', hasAssetId : true},
  statemint: {pallet: 'assets', method:'metadata', hasAssetId : true},
  moonriver: {pallet: 'assets', method:'metadata', hasAssetId : true},
  shiden: {pallet: 'assets', method:'metadata', hasAssetId : true},
  moonbeam: {pallet: 'assets', method:'metadata', hasAssetId : true},
  statemine: {pallet: 'assets', method:'metadata', hasAssetId : true},
  liberland: {pallet: 'assets', method:'metadata', hasAssetId : true},
  dentnet: {pallet: 'assets', method:'metadata', hasAssetId : true},
  phala: {pallet: 'assets', method:'metadata', hasAssetId : true},
  crust: {pallet: 'assets', method:'metadata', hasAssetId : true},
  dbcchain: {pallet: 'assets', method:'metadata', hasAssetId : true},
  rococo_assethub: {pallet: 'assets', method:'metadata', hasAssetId : true},
  hydradx_main: {pallet: 'assetRegistry', method:'assets', hasAssetId : true},
  hydradx_rococo: {pallet: 'assetRegistry', method:'assets', hasAssetId : true},
  acala: {pallet: 'assetRegistry', method:'assetMetadatas', hasAssetId : false},
  bifrost: {pallet: 'assetRegistry', method:'assetMetadatas', hasAssetId : false},
  karura: {pallet: 'assetRegistry', method:'assetMetadatas', hasAssetId : false},
  interlay: {pallet: 'assetRegistry', method:'metadata', hasAssetId : false},
  kintsugi: {pallet: 'assetRegistry', method:'metadata', hasAssetId : false},
  amplitude: {pallet: 'assetRegistry', method:'metadata', hasAssetId : false},
  mangatax_para: {pallet: 'assetRegistry', method:'metadata', hasAssetId : false},
  pendulum: {pallet: 'assetRegistry', method:'metadata', hasAssetId : false},
  pioneer: {pallet: 'assetManager', method:'assetMetadatas', hasAssetId : false},
}

describe('test chain', () => {
  it('chain', async () => {

    const chainInfos = Object.values(ChainInfoMap).filter((info) => ALL_CHAIN.includes(info.slug));
    async function queryAll(chainInfo : _ChainInfo){
      const chain = chainInfo.slug;

      const providerIndex = chainProvider[chain] || chainProvider.default;
      const provider = Object.values(chainInfo.providers)[providerIndex];

      const wsProvider = new WsProvider(provider);
      const api = await ApiPromise.create({provider: wsProvider, noInitWarn: true});

      const {pallet, method, hasAssetId} = chainMap[chain];
      const assetEntries = await api.query[pallet][method].entries();

      const assets = assetEntries.map((all) => {
        // let assetId : string = '';
        // let onChainInfo : string = '';
        //
        // if(hasAssetId){
        //   assetId = JSON.stringify(all[0].toHuman());
        // }else{
        //   onChainInfo = JSON.stringify(all[0].toHuman());
        // }

        let assetId : string | null = '';
        let onChainInfo : object | null = {};

        if (hasAssetId){
          assetId = all[0].toHuman()[0];
        }else {
          onChainInfo = all[0].toHuman()[0];
        }
        // console.log(all[0].toHuman()[0])

        const assetToken = all[1].toHuman() as unknown as AssetQuery;
        if (!['hydradx_main','hydradx_rococo'].includes(chain)) {
          const asset: _ChainAsset = {
            originChain: chain,
            slug: `${chain}-${_AssetType.LOCAL}-${assetToken.symbol}`,
            name: assetToken.name,
            symbol: assetToken.symbol,
            decimals:  assetToken?.decimals || assetToken?.precision,
            minAmount: assetToken?.deposit || assetToken?.existentialDeposit || assetToken?.minimalBalance,
            assetType: _AssetType.LOCAL,
            metadata: {
              assetId: assetId || undefined,
              onChainInfo : JSON.stringify(onChainInfo) || undefined,
            },
            multiChainAsset: null,
            hasValue: !assetToken?.isFrozen ?? true ,
            icon: 'null',
            priceId: assetToken.additional?.coingeckoId || 'null'
          }
          return asset;
        }
        else {
          const asset = {
            'originChain': chain,
            'name': assetToken.name,
            'symbol': assetToken.symbol,
            'decimals':  assetToken.decimals,
            'minAmount': assetToken.existentialDeposit,
            'assetType': assetToken.assetType,
            'metadata': {
              'assetId': all[0].toHuman(),
            },
            'multiChainAsset': null,
            'hasValue': assetToken?.isSufficient ?? true,
            'icon': 'null',
            'priceId':'null'
          }
          return JSON.stringify(asset);
        }

      })
      console.dir(assets, {'maxArrayLength': null});
    }
    const chain = chainInfos.map(queryAll);
    await Promise.all(chain);


  });
});
