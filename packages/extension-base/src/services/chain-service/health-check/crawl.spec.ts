// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ChainInfoMap} from '@subwallet/chain-list';
import {_AssetRef, _AssetRefPath, _AssetType, _ChainAsset, _ChainInfo} from '@subwallet/chain-list/types';
import {ApiPromise, WsProvider} from '@polkadot/api';
import {chainProvider} from './constants';

jest.setTimeout(3 * 60 * 60 * 1000);

const ALL_CHAIN = [
  'hydradx_main','hydradx_rococo',
  // 'statemint', 'acala', 'amplitude', 'kintsugi'
  // 'astar', 'calamari', 'parallel', 'darwinia2', 'crabParachain','pangolin', 'statemint', 'moonriver', 'shiden', 'moonbeam',
  // 'statemine', 'liberland', 'dentnet', 'phala', 'crust', 'dbcchain', 'rococo_assethub', 'hydradx_main', 'hydradx_rococo',
  // 'acala', 'bifrost', 'karura', 'interlay', 'kintsugi', 'amplitude', 'mangatax_para', 'pendulum', 'pioneer'
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
  useMethodAsset : boolean,
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

async function getED(api : ApiPromise, assetId : BigInt){
  const assetEntry = await api.query['assets']['asset'](assetId);
  const metadata = assetEntry.toPrimitive() as unknown as AssetsAsset;
  return metadata.minBalance;
}

function removeComma(vari : string){
  let numstr = vari.replace(/,/g, "");
  return BigInt(numstr);
}

describe('test chain', () => {
  it('crawl', async () => {
    const chainInfos = Object.values(ChainInfoMap).filter((info) => ALL_CHAIN.includes(info.slug));
    async function queryAll(chainInfo : _ChainInfo){
      const chain = chainInfo.slug;

      const providerIndex = chainProvider[chain] || chainProvider.default;
      const provider = Object.values(chainInfo.providers)[providerIndex];

      const wsProvider = new WsProvider(provider);
      const api = await ApiPromise.create({provider: wsProvider, noInitWarn: true});

      const {pallet, method, useMethodAsset, hasAssetId} = chainMap[chain];
      const assetEntries = await api.query[pallet][method].entries();

      const assets = assetEntries.map(async (all) => {
        let metadata: string;
        const assetToken = all[1].toPrimitive() as unknown as AssetQuery;

        const asset: _ChainAsset = {
          originChain: chain,
          slug: `${chain}-${_AssetType.LOCAL}-${assetToken.symbol}`,
          name: assetToken.name,
          symbol: assetToken.symbol,
          decimals: assetToken?.decimals || assetToken?.precision,
          minAmount: assetToken?.existentialDeposit || assetToken?.minimalBalance,
          metadata: {},
          assetType: _AssetType.LOCAL,
          multiChainAsset: null,
          hasValue: !assetToken?.isFrozen ?? true,
          icon: '',
          priceId: null
        };

        if (hasAssetId) {
          const assetId = all[0].toHuman() as string[];
          const numstr = removeComma(assetId[0]);
          metadata = String(numstr);

          if(useMethodAsset){
            const existDepo = await getED(api,numstr);
            asset.minAmount = String(existDepo);
          }

          asset.metadata = {
            assetId: metadata
          };

          return asset;
        } else {
          const onChainInfo = all[0].toHuman() as string[];
          metadata = onChainInfo[0];
          asset.metadata = {
            onChainInfo: metadata
          };

          return asset;
        }
      });
      console.dir(await Promise.all(assets), {'maxArrayLength': null});
    }

    const chain = chainInfos.map(queryAll);
    await Promise.all(chain);

  });

  it('hydration', async () => {
    const CHAIN = ['hydradx_main', 'hydradx_rococo'];
    const ASSETID = ['0', '5', '10', '23', '101', '102', '100', '15', '33', '9', '13', '16', '20', '8', '28', '14', '27',
    '17', '12', '1000085', '30', '1000019', '1000082', '24']

    const chainInfos = Object.values(ChainInfoMap).filter((info) => CHAIN.includes(info.slug));

    async function queryAll(chainInfo : _ChainInfo) {
      const chain = chainInfo.slug;

      const providerIndex = chainProvider[chain] || chainProvider.default;
      const provider = Object.values(chainInfo.providers)[providerIndex];

      const wsProvider = new WsProvider(provider);
      const api = await ApiPromise.create({provider: wsProvider, noInitWarn: true});

      const {pallet, method} = chainMap[chain];
      const assetEntries = await api.query[pallet][method].entries();

      const assets = assetEntries.map((all) => {

        const assetToken = all[1].toPrimitive() as unknown as AssetQuery;

        const assetId = all[0].toHuman() as string[];
        const numstr = removeComma(assetId[0]);
        const metadata = String(numstr);

        if (ASSETID.includes(metadata)) {

          let entry : Record<string,_AssetRef>[] = [];

          assetEntries.forEach((ent) => {

            const assetId = ent[0].toHuman() as string[];
            const numstr = removeComma(assetId[0]);
            const metadata = String(numstr);

            const assetTokenCon = ent[1].toPrimitive() as unknown as AssetQuery;
            const assetConversion: _AssetRef = {
              srcAsset: `${chain}-${_AssetType.LOCAL}-${assetToken.symbol}`,
              destAsset: `${chain}-${_AssetType.LOCAL}-${assetTokenCon.symbol}`,
              srcChain: chain,
              destChain: chain,
              path: _AssetRefPath.SWAP,
            };

            const assetRef : Record<string, _AssetRef> = {};
            const key = `${assetConversion.srcAsset}___${assetConversion.destAsset}`;
            assetRef[key] = assetConversion;

            if (assetToken.symbol != assetTokenCon.symbol && ASSETID.includes(metadata)) {
              entry.push(assetRef);
            }
          })
          return entry;
        }
        else {
          return;
        }
      })
      console.dir(assets, {'maxArrayLength': null});

      }
    const chain = chainInfos.map(queryAll);
    await Promise.all(chain);
  })


});
