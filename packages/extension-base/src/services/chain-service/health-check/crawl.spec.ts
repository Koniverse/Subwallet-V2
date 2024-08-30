// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ChainInfoMap} from '@subwallet/chain-list';
import {_AssetType, _ChainAsset, _ChainInfo} from '@subwallet/chain-list/types';
import {ApiPromise, WsProvider} from '@polkadot/api';
import {chainProvider} from './constants';
import {StorageKey, u32} from "@polkadot/types";
import {Codec} from "@polkadot/types/types";

jest.setTimeout(3 * 60 * 60 * 1000);

const ALL_CHAIN = [
  // 'acala', 'hydradx_main','sora_substrate','astar'
  'astar', 'calamari', 'parallel', 'darwinia2', 'crabParachain','pangolin', 'statemint', 'moonriver', 'shiden', 'moonbeam', 'statemine',
  'liberland', 'dentnet', 'phala', 'crust', 'dbcchain', 'rococo_assethub', 'hydradx_main', 'hydradx_rococo',
  'acala', 'bifrost', 'karura', 'interlay', 'kintsugi', 'amplitude', 'mangatax_para', 'pendulum', 'pioneer'
]

const ASSETID_CHAIN_AM = [
  // 'astar','calamari'
  'astar', 'calamari', 'parallel', 'darwinia2', 'crabParachain','pangolin', 'statemint', 'moonriver', 'shiden', 'moonbeam', 'statemine',
  'liberland', 'dentnet', 'phala', 'crust', 'dbcchain', 'rococo_assethub'
]

const ASSETID_CHAIN_ARA = [
  'hydradx_main', 'hydradx_rococo'
]

// const ASSETID_CHAIN_AAI = [
//   'sora_substrate'
// ]

const ONCHAININFO_CHAIN_AM = [
  'acala', 'bifrost', 'karura'
]

const ONCHAININFO_CHAIN_M = [
  'interlay', 'kintsugi', 'amplitude', 'mangatax_para', 'pendulum'
]

const ONCHAININFO_CHAIN_AMAM = [
  'pioneer'
]

const ASSETIDCHAIN = [
  'astar', 'calamari', 'parallel', 'darwinia2', 'crabParachain','pangolin', 'statemint', 'moonriver', 'shiden', 'moonbeam', 'statemine',
  'liberland', 'dentnet', 'phala', 'crust', 'dbcchain', 'rococo_assethub', 'hydradx_main', 'hydradx_rococo'
]
const ONCHAININFOCHAIN = [
  'acala', 'bifrost', 'karura', 'interlay', 'kintsugi', 'amplitude', 'mangatax_para', 'pendulum', 'pioneer'
]
// interface AssetIdAM {
//   deposit : number,
//   name : string,
//   symbol : string,
//   decimals : number,
//   isFrozen : boolean
// }
//
// interface AssetIdARA {
//   name : string,
//   assetType : string,
//   existentialDeposit : number,
//   symbol : string,
//   decimals : number,
//   isSufficient : boolean
// }
//
// interface AssetIdAAI {
//   symbol : string,
//   name : string,
//   precision : number,
//   assetType : string,
//   originChain: string

// }
//
// interface OnChainInfoAM {
//   name : string,
//   symbol : string,
//   decimals : number,
//   minimalBalance : number
// }
//
// interface OnChainInfoM {
//   name : string,
//   decimals : number,
//   symbol : string,
//   existentialDeposit : number,
//   additional: {
//     feePerSecond : number,
//     coingeckoId : string
//   }
// }

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



describe('test chain', () => {
  it('chain', async () => {

    const chainInfos = Object.values(ChainInfoMap).filter((info) => ALL_CHAIN.includes(info.slug));
    async function queryAll(chainInfo : _ChainInfo){
      const chain = chainInfo.slug;

      const providerIndex = chainProvider[chain] || chainProvider.default;
      const provider = Object.values(chainInfo.providers)[providerIndex];

      const wsProvider = new WsProvider(provider);
      const api = await ApiPromise.create({provider: wsProvider, noInitWarn: true});

      //let assetEntries : [StorageKey<[u32]>, Codec][] = [];
      // switch (true) {
      //   case ASSETID_CHAIN_AM.includes(chain):
      //     assetEntries =  await api.query.assets.metadata.entries();
      //     break;
      //   case ASSETID_CHAIN_ARA.includes(chain):
      //     assetEntries = await api.query.assetRegistry.assets.entries();
      //     break;
      //   case ASSETID_CHAIN_AAI.includes(chain):
      //     assetEntries = await api.query.assets.assetInfosV2.entries();
      //     break;
      //   case ONCHAININFO_CHAIN_AM.includes(chain):
      //     assetEntries = await api.query.assetRegistry.assetMetadatas.entries();
      //     break;
      //   case ONCHAININFO_CHAIN_M.includes(chain):
      //     assetEntries = await api.query.assetRegistry.metadata.entries();
      //     break;
      //   case ONCHAININFO_CHAIN_AMAM.includes(chain):
      //     assetEntries = await api.query.assetManager.assetMetadatas.entries();
      //     break;
      //   default: break;
      // }

      const assetEntries = await api.query?.assets?.metadata?.entries()
        || await api.query?.assetRegistry?.assets?.entries()
        || await api.query?.assetRegistry?.assetMetadatas?.entries()
        || await api.query?.assetRegistry?.metadata?.entries()
        || await api.query?.assetManager?.assetMetadatas?.entries();




      const assets = assetEntries.map((all) => {
          let assetId : string = '';
          let onChainInfo : string = '';
          if (ASSETIDCHAIN.includes(chain)){
             assetId = JSON.stringify(all[0].toHuman());
          } else if (ONCHAININFOCHAIN.includes(chain)) {
             onChainInfo = JSON.stringify(all[0].toHuman());
          }

          const assetToken = all[1].toHuman() as unknown as AssetQuery;
          // console.log(assetToken);

          if (assetToken.symbol !== null) {
            const asset: _ChainAsset = {
              originChain: chain,
              slug: `${chain}-${_AssetType.LOCAL}-${assetToken.symbol}`,
              name: assetToken.name,
              symbol: assetToken.symbol,
              decimals:  assetToken?.decimals || assetToken?.precision,
              minAmount: assetToken?.deposit || assetToken?.existentialDeposit || assetToken?.minimalBalance || null,
              assetType: _AssetType.LOCAL,
              metadata: {
                assetId: assetId || undefined,
                onChainInfo : onChainInfo || undefined,
              },
              multiChainAsset: null,
              hasValue: !assetToken?.isFrozen || assetToken?.isSufficient || true,
              icon: 'null',
              priceId: assetToken.additional?.coingeckoId || 'null'
            }
            return asset;
          }
          else {return}

        })
      console.dir(assets, {'maxArrayLength': null});
    }
    const chain = chainInfos.map(queryAll);
    await Promise.all(chain);

/*

    const chainInfos1 = Object.values(ChainInfoMap).filter((info) => ASSETID_CHAIN_AM.includes(info.slug));
    async function queryAll1(chainInfo : _ChainInfo){
      const chain = chainInfo.slug;

      const providerIndex = chainProvider[chain] || chainProvider.default;
      const provider = Object.values(chainInfo.providers)[providerIndex];

      const wsProvider = new WsProvider(provider);
      const api = await ApiPromise.create({provider: wsProvider, noInitWarn: true});

      const assetEntries = await api.query.assets.metadata.entries();

      const assets = assetEntries.map((all) => {
        const assetId = all[0].toHuman();
        const assetToken = all[1].toHuman() as unknown as AssetIdAM;
        const asset : _ChainAsset = {
          originChain : chain,
          slug : `${chain}-${_AssetType.LOCAL}-${assetToken.symbol}`,
          name : assetToken.name,
          symbol : assetToken.symbol,
          decimals : assetToken.decimals,
          minAmount : String(assetToken.deposit),
          assetType : _AssetType.LOCAL,
          metadata : {
            assetId : String(assetId),
          },
          hasValue : !assetToken.isFrozen,
          priceId : null,
          multiChainAsset : null,
          icon : 'undefined'
        }
        return asset;
      })
      console.dir(assets, {'maxArrayLength' : null});
    }
    const chain1 = chainInfos1.map(queryAll1);
    await Promise.all(chain1);

    const chainInfos2 = Object.values(ChainInfoMap).filter((info) => ASSETID_CHAIN_ARA.includes(info.slug));
    async function queryAll2(chainInfo: _ChainInfo) {
      const chain = chainInfo.slug;

      const providerIndex = chainProvider[chain] || chainProvider.default;
      const provider = Object.values(chainInfo.providers)[providerIndex];

      const wsProvider = new WsProvider(provider);
      const api = await ApiPromise.create({provider: wsProvider, noInitWarn: true});

      const assetEntries = await api.query.assetRegistry.assets.entries();

      for (let i = 0; i < assetEntries.length; i++) {
        const tokenId = assetEntries[i][0].toHuman();
        const assetToken = assetEntries[i][1].toHuman() as unknown as AssetIdARA;
        if (assetToken.symbol !== null && assetToken.assetType == 'Token') {
          const asset: _ChainAsset = {
            originChain: chain,
            slug: `${chain}-${_AssetType.LOCAL}-${assetToken.symbol}`,
            name: assetToken.name,
            symbol: assetToken.symbol,
            decimals: assetToken.decimals,
            minAmount: String(assetToken.existentialDeposit),
            assetType: _AssetType.LOCAL,
            metadata: {
              assetId: String(tokenId),
            },
            hasValue: assetToken.isSufficient,
            priceId: null,
            multiChainAsset: null,
            icon: 'undefined'
          }
          console.log(asset);
        }
      }



      //   const assets = assetEntries.map((all) => {
      //     const tokenId = all[0].toHuman();
      //     const assetToken = all[1].toHuman() as unknown as AssetIdARA;
      //     if ( assetToken.symbol !== null && assetToken.assetType == 'Token') {
      //       const asset: _ChainAsset = {
      //         originChain: chain,
      //         slug: `${chain}-${_AssetType.LOCAL}-${assetToken.symbol}`,
      //         name: assetToken.name,
      //         symbol: assetToken.symbol,
      //         decimals: assetToken.decimals,
      //         minAmount: String(assetToken.existentialDeposit),
      //         assetType: _AssetType.LOCAL,
      //         metadata: {
      //           assetId: String(tokenId),
      //         },
      //         hasValue: assetToken.isSufficient,
      //         priceId: null,
      //         multiChainAsset: null,
      //         icon: 'undefined'
      //       }
      //       return asset;
      //     } else {return}
      //   })
      //   console.dir(assets, {'maxArrayLength' : null});
      // }

    }
    const chain2 = chainInfos2.map(queryAll2);
    await Promise.all(chain2);

    // const chainInfos3 = Object.values(ChainInfoMap).filter((info) => ASSETID_CHAIN_AAI.includes(info.slug));
    // async function queryAll3(chainInfo: _ChainInfo){
    //   const chain = chainInfo.slug;
    //
    //   const providerIndex = chainProvider[chain] || chainProvider.default;
    //   const provider = Object.values(chainInfo.providers)[providerIndex];
    //
    //   const wsProvider = new WsProvider(provider);
    //   const api = await ApiPromise.create({provider: wsProvider, noInitWarn: true});
    //
    //   const assetEntries = await api.query.assets.assetInfosV2.entries();
    //
    //   const assets = assetEntries.map((all) => {
    //     const tokenId = JSON.stringify(all[0].toHuman());
    //     const assetToken = all[1].toHuman() as unknown as AssetIdAAI;
    //     const asset: AssetIdAAI = {
    //       originChain: chain,
    //       name: assetToken.name,
    //       symbol: assetToken.symbol,
    //       precision: assetToken.precision,
    //       assetType: _AssetType.UNKNOWN,
    //       metadata: {
    //         assetId: JSON.parse(tokenId)[0].code,
    //       },
    //     }
    //     return asset;
    //   })
    //   console.dir(assets, {'maxArrayLength': null});
    // }
    // const chain3 = chainInfos3.map(queryAll3);
    // await Promise.all(chain3);

    const chainInfos4 = Object.values(ChainInfoMap).filter((info) => ONCHAININFO_CHAIN_AM.includes(info.slug));
    async function queryAll4(chainInfo: _ChainInfo){
      const chain = chainInfo.slug;

      const providerIndex = chainProvider[chain] || chainProvider.default;
      const provider = Object.values(chainInfo.providers)[providerIndex];

      const wsProvider = new WsProvider(provider);
      const api = await ApiPromise.create({provider: wsProvider, noInitWarn: true});

      const assetEntries = await api.query.assetRegistry.assetMetadatas.entries();

      const assets = assetEntries.map((all) => {
        const onChainInfo = JSON.stringify(all[0].toHuman());
        //console.log(Object.values(onChainInfo))
        const assetToken = all[1].toHuman() as unknown as OnChainInfoAM;
        const asset: _ChainAsset = {
          originChain: chain,
          slug: `${chain}-${_AssetType.LOCAL}-${assetToken.symbol}`,
          name: assetToken.name,
          symbol: assetToken.symbol,
          decimals: assetToken.decimals,
          minAmount: String(assetToken.minimalBalance),
          assetType: _AssetType.LOCAL,
          metadata: {
            onChainInfo: JSON.stringify(JSON.parse(onChainInfo)[0]),
          },
          hasValue: true,
          priceId: null,
          multiChainAsset: null,
          icon: 'undefined'
        }
        return asset;
      })
      console.dir(assets, {'maxArrayLength': null});
    }
    const chain4 = chainInfos4.map(queryAll4);
    await Promise.all(chain4);

    const chainInfos5 = Object.values(ChainInfoMap).filter((info) => ONCHAININFO_CHAIN_M.includes(info.slug));
    async function queryAll5(chainInfo: _ChainInfo){
      const chain = chainInfo.slug;

      const providerIndex = chainProvider[chain] || chainProvider.default;
      const provider = Object.values(chainInfo.providers)[providerIndex];

      const wsProvider = new WsProvider(provider);
      const api = await ApiPromise.create({provider: wsProvider, noInitWarn: true});

      const assetEntries = await api.query.assetRegistry.metadata.entries();

      const assets = assetEntries.map((all) => {
        const onChainInfo = JSON.parse(JSON.stringify(all[0].toHuman()))[0];
        const assetToken = all[1].toHuman() as unknown as OnChainInfoM;
        const asset: _ChainAsset = {
          originChain: chain,
          slug: `${chain}-${_AssetType.LOCAL}-${assetToken.symbol}`,
          name: assetToken.name,
          symbol: assetToken.symbol,
          decimals: assetToken.decimals,
          minAmount: String(assetToken.existentialDeposit),
          assetType: _AssetType.LOCAL,
          metadata: {
            onChainInfo: onChainInfo,
          },
          hasValue: true,
          priceId: assetToken.additional.coingeckoId,
          multiChainAsset: null,
          icon: 'undefined'
        }
        return asset;
      })
      console.dir(assets, {'maxArrayLength': null});
    }
    const chain5 = chainInfos5.map(queryAll5);
    await Promise.all(chain5);

    const chainInfos6 = Object.values(ChainInfoMap).filter((info) => ONCHAININFO_CHAIN_AMAM.includes(info.slug));
    async function queryAll6(chainInfo: _ChainInfo){
      const chain = chainInfo.slug;

      const providerIndex = chainProvider[chain] || chainProvider.default;
      const provider = Object.values(chainInfo.providers)[providerIndex];

      const wsProvider = new WsProvider(provider);
      const api = await ApiPromise.create({provider: wsProvider, noInitWarn: true});

      const assetEntries = await api.query.assetManager.assetMetadatas.entries();

      const assets = assetEntries.map((all) => {
        const onChainInfo = JSON.stringify(all[0].toHuman());
        const assetToken = all[1].toHuman() as unknown as OnChainInfoAM;
        const asset: _ChainAsset = {
          originChain: chain,
          slug: `${chain}-${_AssetType.LOCAL}-${assetToken.symbol}`,
          name: assetToken.name,
          symbol: assetToken.symbol,
          decimals: assetToken.decimals,
          minAmount: String(assetToken.minimalBalance),
          assetType: _AssetType.LOCAL,
          metadata: {
            onChainInfo: onChainInfo,
          },
          hasValue: true,
          priceId: null,
          multiChainAsset: null,
          icon: 'undefined'
        }
        return asset;
      })
      console.dir(assets, {'maxArrayLength': null});
    }
    const chain6 = chainInfos6.map(queryAll6);
    await Promise.all(chain6);

*/


  });
});
