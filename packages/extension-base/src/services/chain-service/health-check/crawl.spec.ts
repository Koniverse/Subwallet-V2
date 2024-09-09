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

type AssetsAsset = {
  supply: number,
  deposit: number,
  minBalance: number,
  isSufficient: boolean,
  accounts: number
}

interface PalletMethod {
  pallet : 'assets'|'assetRegistry'|'assetManager',
  method : 'metadata'|'assetMetadatas'|'assets',
  useMethodAsset: boolean,
  hasAssetId : boolean
}

const chainMap : Record<string , PalletMethod> = {
  astar : {pallet: 'assets', method:'metadata',useMethodAsset: true, hasAssetId : true},
  calamari: {pallet: 'assets', method:'metadata',useMethodAsset: true, hasAssetId : true},
  parallel: {pallet: 'assets', method:'metadata',useMethodAsset: true, hasAssetId : true},
  darwinia2: {pallet: 'assets', method:'metadata',useMethodAsset: true, hasAssetId : true},
  crabParachain: {pallet: 'assets', method:'metadata',useMethodAsset: true, hasAssetId : true},
  pangolin: {pallet: 'assets', method:'metadata',useMethodAsset: true, hasAssetId : true},
  statemint: {pallet: 'assets', method:'metadata',useMethodAsset: true, hasAssetId : true},
  moonriver: {pallet: 'assets', method:'metadata',useMethodAsset: true, hasAssetId : true},
  shiden: {pallet: 'assets', method:'metadata',useMethodAsset: true, hasAssetId : true},
  moonbeam: {pallet: 'assets', method:'metadata',useMethodAsset: true, hasAssetId : true},
  statemine: {pallet: 'assets', method:'metadata',useMethodAsset: true, hasAssetId : true},
  liberland: {pallet: 'assets', method:'metadata',useMethodAsset: true, hasAssetId : true},
  dentnet: {pallet: 'assets', method:'metadata',useMethodAsset: true, hasAssetId : true},
  phala: {pallet: 'assets', method:'metadata',useMethodAsset: true, hasAssetId : true},
  crust: {pallet: 'assets', method:'metadata',useMethodAsset: true, hasAssetId : true},
  dbcchain: {pallet: 'assets', method:'metadata',useMethodAsset: true, hasAssetId : true},
  rococo_assethub: {pallet: 'assets', method:'metadata',useMethodAsset: true, hasAssetId : true},
  hydradx_main: {pallet: 'assetRegistry', method:'assets',useMethodAsset: false, hasAssetId : true},
  hydradx_rococo: {pallet: 'assetRegistry', method:'assets',useMethodAsset: false, hasAssetId : true},
  acala: {pallet: 'assetRegistry', method:'assetMetadatas',useMethodAsset: false, hasAssetId : false},
  bifrost: {pallet: 'assetRegistry', method:'assetMetadatas',useMethodAsset: false, hasAssetId : false},
  karura: {pallet: 'assetRegistry', method:'assetMetadatas',useMethodAsset: false, hasAssetId : false},
  interlay: {pallet: 'assetRegistry', method:'metadata',useMethodAsset: false, hasAssetId : false},
  kintsugi: {pallet: 'assetRegistry', method:'metadata',useMethodAsset: false, hasAssetId : false},
  amplitude: {pallet: 'assetRegistry', method:'metadata',useMethodAsset: false, hasAssetId : false},
  mangatax_para: {pallet: 'assetRegistry', method:'metadata',useMethodAsset: false, hasAssetId : false},
  pendulum: {pallet: 'assetRegistry', method:'metadata',useMethodAsset: false, hasAssetId : false},
  pioneer: {pallet: 'assetManager', method:'assetMetadatas',useMethodAsset: false, hasAssetId : false},
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

      const {pallet, method, useMethodAsset, hasAssetId} = chainMap[chain];
      const assetEntries = await api.query[pallet][method].entries();

      // if(useMethodAsset) {
      //   const assetEntry = await api.query[pallet]['asset'].entries();
      //   const assetAsset = assetEntry.map((all) =>{
      //     const token = all[1].toHuman() as unknown as AssetsAsset;
      //     console.log(token.minBalance);
      //   })
      //   console.log(assetAsset)
      // }else {return}
      async function getED(api : ApiPromise, assetId : number){
        const assetEntry = await api.query['assets']['asset'](assetId);
        return
      }

      // function remove(id : string){
      //   let numstr = id.replace(/,/g, "")
      //   return Number(numstr)
      // }

      const assets = assetEntries.map((all) => {
        let assetId : string = '';
        let onChainInfo : string = '';
        // let minAmount : number = 0;

        if(hasAssetId){
          assetId = JSON.stringify(all[0].toHuman());
        }else{
          onChainInfo = JSON.stringify(all[0].toHuman());
        }

        // let assetId : string | null = '';
        // let onChainInfo : object | null = {};
        //
        // if (hasAssetId){
        //   assetId = all[0].toHuman()[0];
        // }else {
        //   onChainInfo = all[0].toHuman()[0];
        // }
        // console.log(all[0].toHuman()[0])

        const assetToken = all[1].toHuman() as unknown as AssetQuery;
        if (!['hydradx_main','hydradx_rococo'].includes(chain)) {
          const asset: _ChainAsset = {
            originChain: chain,
            slug: `${chain}-${_AssetType.LOCAL}-${assetToken.symbol}`,
            name: assetToken.name,
            symbol: assetToken.symbol,
            decimals:  assetToken?.decimals || assetToken?.precision,
            minAmount:  assetToken?.existentialDeposit || assetToken?.minimalBalance ,
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
