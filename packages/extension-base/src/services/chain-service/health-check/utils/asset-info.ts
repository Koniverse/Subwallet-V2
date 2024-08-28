// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainAsset } from '@subwallet/chain-list/types';
import { getERC20Contract } from '@subwallet/extension-base/koni/api/contract-handler/evm/web3';
import { _PSP22_ABI } from '@subwallet/extension-base/koni/api/contract-handler/utils';
import { getDefaultWeightV2 } from '@subwallet/extension-base/koni/api/contract-handler/wasm/utils';
import { _EvmApi } from '@subwallet/extension-base/services/chain-service/types';
import { _getContractAddressOfToken, _getTokenOnChainAssetId, _getTokenOnChainInfo } from '@subwallet/extension-base/services/chain-service/utils';
import BigN from 'bignumber.js';

import { ApiPromise } from '@polkadot/api';
import { ContractPromise } from '@polkadot/api-contract';

const BN_TEN = new BigN(10);

export interface AssetSpec {
  minAmount: string;
  symbol: string;
  decimals: number;
}

interface AssetPalletMetadata {
  deposit: number;
  name: string;
  symbol: string;
  decimals: number;
}

interface AssetPalletInfo {
  deposit: number;
  minBalance: number;
}

interface AssetRegistryWithChainInfoPalletMetadata {
  name: string;
  symbol: string;
  decimals: number;
  minimalBalance: number;
}

interface AssetRegistryWithChainInfoPalletMetadataV3 {
  decimals: number;
  name: string;
  symbol: string;
  existentialDeposit: number;
  location: object | undefined;
  additional: object | undefined;
}

interface OrmlAssetRegistryPalletMetadata {
  decimals: number;
  name: string;
  symbol: string;
  existentialDeposit: number;
  location: object | undefined;
  additional: object | undefined;
}

interface AssetManagerWithChainInfoPalletMetadata {
  name: string;
  symbol: string;
  decimals: number;
  minimalBalance: number;
}

interface AssetRegistryWithAssetIdPalletInfo {
  name: string;
  existentialDeposit: number;
  decimals: number;
  symbol: string;
}

interface AssetManagerWithAssetIdPalletMetadata {
  metadata: {
    name: string;
    symbol: string;
    decimals: number;
  };
  minBalance: number;
}

interface EvmChainInfo {
  name: string;
  chain: string;
  icon: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  },
  infoURL: string;
  shortName: string;
  chainId: number;
  networkId: number;
  slip44: number;
}

const getByAssetPallet = async (asset: _ChainAsset, api: ApiPromise): Promise<AssetSpec> => {
  const [_info, _metadata] = await api.queryMulti([
    [api.query.assets.asset, _getTokenOnChainAssetId(asset)],
    [api.query.assets.metadata, _getTokenOnChainAssetId(asset)]
  ]);

  const info = _info.toPrimitive() as unknown as AssetPalletInfo;
  const metadata = _metadata.toPrimitive() as unknown as AssetPalletMetadata;

  return {
    decimals: metadata.decimals,
    minAmount: info.minBalance.toString(),
    symbol: metadata.symbol
  };
};

const getByAssetRegistryWithChainInfoPallet = async (asset: _ChainAsset, api: ApiPromise): Promise<AssetSpec> => {
  const raw = _getTokenOnChainInfo(asset);
  let data;

  if ('ForeignAsset' in raw) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    data = { ForeignAssetId: raw.ForeignAsset };
  } else if ('Erc20' in raw) {
    data = raw;
  } else if ('StableAssetPoolToken' in raw) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    data = { StableAssetId: raw.StableAssetPoolToken };
  } else {
    data = { NativeAssetId: raw };
  }

  const _metadata = await api.query.assetRegistry.assetMetadatas(data);

  const metadata = _metadata.toPrimitive() as unknown as AssetRegistryWithChainInfoPalletMetadata;

  return {
    decimals: metadata.decimals,
    minAmount: metadata.minimalBalance.toString(),
    symbol: metadata.symbol
  };
};

const getByAssetRegistryWithChainInfoPalletV2 = async (asset: _ChainAsset, api: ApiPromise): Promise<AssetSpec> => {
  const data = _getTokenOnChainInfo(asset);

  const _metadata = await api.query.assetRegistry.currencyMetadatas(data);

  const metadata = _metadata.toPrimitive() as unknown as AssetRegistryWithChainInfoPalletMetadata;

  return {
    decimals: metadata.decimals,
    minAmount: metadata.minimalBalance.toString(),
    symbol: metadata.symbol
  };
};

const getByAssetRegistryWithChainInfoPalletV3 = async (asset: _ChainAsset, api: ApiPromise): Promise<AssetSpec> => {
  const data = _getTokenOnChainInfo(asset);

  const _metadata = await api.query.assetRegistry.metadata(data);

  const metadata = _metadata.toPrimitive() as unknown as AssetRegistryWithChainInfoPalletMetadataV3;

  return {
    decimals: metadata.decimals,
    minAmount: metadata.existentialDeposit.toString(),
    symbol: metadata.symbol
  };
};

const getByOrmlAssetRegistryPallet = async (asset: _ChainAsset, api: ApiPromise): Promise<AssetSpec> => {
  const data = _getTokenOnChainInfo(asset);

  const _metadata = await api.query.ormlAssetRegistry.metadata(data);

  const metadata = _metadata.toPrimitive() as unknown as OrmlAssetRegistryPalletMetadata;

  return {
    decimals: metadata.decimals,
    minAmount: metadata.existentialDeposit.toString(),
    symbol: metadata.symbol
  };
};

const getByAssetManagerWithChainInfoPallet = async (asset: _ChainAsset, api: ApiPromise): Promise<AssetSpec> => {
  const raw = _getTokenOnChainInfo(asset);
  let data;

  if ('ForeignAsset' in raw) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    data = { ForeignAssetId: raw.ForeignAsset };
  } else if ('Erc20' in raw) {
    data = raw;
  } else {
    data = { NativeAssetId: raw };
  }

  const _metadata = await api.query.assetManager.assetMetadatas(data);

  const metadata = _metadata.toPrimitive() as unknown as AssetManagerWithChainInfoPalletMetadata;

  return {
    decimals: metadata.decimals,
    minAmount: metadata.minimalBalance.toString(),
    symbol: metadata.symbol
  };
};

const getByAssetManagerWithAssetIdPallet = async (asset: _ChainAsset, api: ApiPromise): Promise<AssetSpec> => {
  const _metadata = await api.query.assetManager.assetIdMetadata(_getTokenOnChainAssetId(asset));

  const metadata = _metadata.toPrimitive() as unknown as AssetManagerWithAssetIdPalletMetadata;

  return {
    decimals: metadata.metadata.decimals,
    minAmount: metadata.minBalance.toString(),
    symbol: metadata.metadata.symbol
  };
};

const getByAssetRegistryWithAssetIdPallet = async (asset: _ChainAsset, api: ApiPromise): Promise<AssetSpec> => {
  const [_info] = await api.queryMulti([
    [api.query.assetRegistry.assets, _getTokenOnChainAssetId(asset)]
  ]);

  const info = _info.toPrimitive() as unknown as AssetRegistryWithAssetIdPalletInfo;

  return {
    decimals: info.decimals,
    minAmount: info.existentialDeposit.toString(),
    symbol: info.symbol
  };
};

export const getLocalAssetInfo = async (chain: string, asset: _ChainAsset, api: ApiPromise): Promise<AssetSpec> => {
  if (['astar', 'shiden', 'shibuya', 'statemint', 'statemine', 'moonbeam', 'moonbase', 'moonriver', 'parallel', 'pangolin', 'darwinia2', 'crabParachain'].includes(chain)) {
    return getByAssetPallet(asset, api);
  } else if (['pioneer', 'bitcountry'].includes(chain)) {
    return getByAssetManagerWithChainInfoPallet(asset, api);
  } else if (['acala', 'karura', 'acala_testnet'].includes(chain)) {
    return getByAssetRegistryWithChainInfoPallet(asset, api);
  } else if (['bifrost', 'bifrost_dot', 'bifrost_testnet'].includes(chain)) {
    return getByAssetRegistryWithChainInfoPalletV2(asset, api);
  } else if (['hydradx_main'].includes(chain)) {
    return getByAssetRegistryWithAssetIdPallet(asset, api);
  } else if (['calamari', 'manta_network'].includes(chain)) {
    return getByAssetManagerWithAssetIdPallet(asset, api);
  } else if (['amplitude', 'pendulum'].includes(chain)) {
    return getByAssetRegistryWithChainInfoPalletV3(asset, api);
  } else if (['centrifuge'].includes(chain)) {
    return getByOrmlAssetRegistryPallet(asset, api);
  }

  throw new Error('Fail to get info');
};

// eslint-disable-next-line @typescript-eslint/require-await
export const getSubstrateNativeInfo = async (api: ApiPromise): Promise<AssetSpec> => {
  const minAmount = api.consts.balances ? api.consts.balances.existentialDeposit.toString() : api.consts.eqBalances.existentialDeposit.toString();
  const symbol = api.registry.chainTokens[0];
  const decimals = api.registry.chainDecimals[0];

  return {
    decimals,
    minAmount,
    symbol
  };
};

export const getPsp22AssetInfo = async (asset: _ChainAsset, api: ApiPromise): Promise<AssetSpec> => {
  const contractAddress = _getContractAddressOfToken(asset);
  const tokenContract = new ContractPromise(api, _PSP22_ABI, contractAddress);

  const [nameResp, symbolResp, decimalsResp] = await Promise.all([
    tokenContract.query['psp22Metadata::tokenName'](contractAddress, { gasLimit: getDefaultWeightV2(api) }), // read-only operation so no gas limit
    tokenContract.query['psp22Metadata::tokenSymbol'](contractAddress, { gasLimit: getDefaultWeightV2(api) }),
    tokenContract.query['psp22Metadata::tokenDecimals'](contractAddress, { gasLimit: getDefaultWeightV2(api) })
  ]);

  if (!(nameResp.result.isOk && symbolResp.result.isOk && decimalsResp.result.isOk) || !nameResp.output || !decimalsResp.output || !symbolResp.output) {
    return {
      decimals: -1,
      symbol: '',
      minAmount: '0'
    };
  } else {
    const symbolObj = symbolResp.output?.toHuman() as Record<string, any>;
    const decimalsObj = decimalsResp.output?.toHuman() as Record<string, any>;
    const nameObj = nameResp.output?.toHuman() as Record<string, any>;

    const name = nameResp.output ? (nameObj.Ok as string || nameObj.ok as string) : '';
    const decimals = decimalsResp.output ? (new BigN((decimalsObj.Ok || decimalsObj.ok) as string | number)).toNumber() : 0;
    const symbol = decimalsResp.output ? (symbolObj.Ok as string || symbolObj.ok as string) : '';

    if (!name || !symbol || typeof name === 'object' || typeof symbol === 'object') {
      return {
        decimals: -1,
        symbol: '',
        minAmount: '0'
      };
    }

    return {
      decimals: decimals,
      symbol: symbol,
      minAmount: '0'
    };
  }
};

export const getEvmNativeInfo = async (api: _EvmApi): Promise<AssetSpec> => {
  const chainId = await api.api.eth.getChainId();

  const fetchData = () => {
    return new Promise<EvmChainInfo | undefined>((resolve, reject) => {
      fetch('https://chainid.network/chains.json')
        .then((res) => {
          return res.json();
        })
        .then((json: EvmChainInfo[]) => {
          const rs = json.find((i) => i.chainId === chainId);

          resolve(rs);
        })
        .catch((e) => {
          reject(e);
        });
    });
  };

  const data = await fetchData();

  if (data) {
    return {
      decimals: data.nativeCurrency.decimals,
      symbol: data.nativeCurrency.symbol,
      minAmount: '0'
    };
  }

  throw new Error('Cannot get info');
};

export const getErc20AssetInfo = async (asset: _ChainAsset, api: _EvmApi): Promise<AssetSpec> => {
  const contractAddress = _getContractAddressOfToken(asset);
  const tokenContract = getERC20Contract(contractAddress, api);

  const [_decimals, _symbol, _name] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
    tokenContract.methods.decimals().call() as number,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
    tokenContract.methods.symbol().call() as string,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
    tokenContract.methods.name().call() as string
  ]);

  const name = _name;
  const decimals = new BigN(_decimals).toNumber();
  const symbol = _symbol;

  if (!name || !symbol || typeof name === 'object' || typeof symbol === 'object') {
    return {
      decimals: -1,
      symbol: '',
      minAmount: '0'
    };
  }

  return {
    decimals: decimals,
    symbol: symbol,
    minAmount: '0'
  };
};

// const SKIP_ASSETS = [
//   'ethereum-ERC20-MKR-0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2',
//   'moonbeam-ERC20-USDC.axl-0xCa01a1D0993565291051daFF390892518ACfAD3A',
//   'moonbeam-ERC20-USDT.wh-0xc30E9cA94CF52f3Bf5692aaCF81353a27052c46f',
//   'moonbeam-ERC20-USDC.wh-0x931715fee2d06333043d11f658c8ce934ac61d0c',
//   'moonbeam-ERC20-WBTC.wh-0xe57ebd2d67b462e9926e04a8e33f01cd0d64346d',
//   'moonbeam-ERC20-ETH.wh-0xab3f0245b83feb11d15aaffefd7ad465a59817ed',
//   'polygon-ERC20-USDC.e-0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
//   'astarEvm-ERC20-ARSW_LP-0x87988EbDE7E661F44eB3a586C5E0cEAB533a2d9C',
//   'bifrost-LOCAL-aSEED',
//   'calamari-LOCAL-aSEED',
//   'hydradx_main-LOCAL-DED',
//   'hydradx_main-LOCAL-PINK',
//   'hydradx_main-LOCAL-BEEFY',
//   'hydradx_main-LOCAL-STINK',
//   'hydradx_main-LOCAL-WIFD',
//   'hydradx_main-LOCAL-BORK',
//   'hydradx_main-LOCAL-KOL',
//   'acala_evm-NATIVE-ACA',
//   'karura_evm-NATIVE-KAR',
//   'commune-NATIVE-COMAI',
//   'bitlayer-ERC20-ordi-0xde9f57a5b8844ebf607eceffaa2505bb961701a4',
//   'bitlayer-ERC20-sats-0x8dae8b60f16a10edfac1714394688e006ff369fa',
//   'bitlayer-ERC20-rats-0x0d922f10d86243ceff899f15571f51951e8b20f6'
// ]
// const skipSymbol = [
//   'TON', 'USDC.axl', 'USDC.wh', 'USDC.wh', 'WBTC.wh', 'ETH.wh', 'USDC.e', 'ARSW_LP', 'aSEED', 'DED', 'PINK', 'BEEFY', 'STINK',
//   'WIFD', 'BORK', 'KOL', 'COMAI', 'ordi', 'sats', 'rats'
// ]


export const compareAsset = (
  assetInfo: AssetSpec,
  asset: _ChainAsset,
  errors: string[]
) => {
  const isHasValue = asset.hasValue;
   //if (!SKIP_ASSETS.includes(asset.slug)) {

     const {decimals, minAmount, symbol} = assetInfo;

     const _minAmount = asset.minAmount || '0';
     const _decimals = asset.decimals || 0;

     if (minAmount !== _minAmount) {
       const convert = new BigN(minAmount).dividedBy(BN_TEN.pow(decimals)).toFixed();
       const _convert = new BigN(_minAmount).dividedBy(BN_TEN.pow(_decimals)).toFixed();
       if (!isHasValue) {
         errors.push(`Wrong minAmount but it's in Testnet `)
       } else {
         errors.push(`Wrong min amount: current - ${asset.minAmount ?? 'null'} (${_convert}), onChain - ${minAmount} (${convert})`);
       }
     }

     if (symbol !== asset.symbol) {
       if (!isHasValue) {
         errors.push(`Wrong symbol but it's in Testnet`)
       }else
         //if((!skipAsset.includes(asset.slug)) && (!skipSymbol.includes(asset.symbol)))
        {
         const zkSymbol = 'zk' + symbol;

         if (zkSymbol !== asset.symbol) {
           errors.push(`Wrong symbol: current - ${asset.symbol}, onChain - ${symbol}`);
         }
       }
     }

     if (decimals !== _decimals) {
       if (!isHasValue) {
         errors.push(`Wrong decimals but it's in Testnet`)
       } else {
         errors.push(`Wrong decimals: current - ${asset.decimals ?? 'null'}, onChain - ${decimals}`);
       }
     }
   //}
};

export const validateAsset = (
  onchainAsset: AssetSpec,
  chainlistAsset: _ChainAsset
) => {
  const { decimals, minAmount, symbol } = onchainAsset;

  const chainlistMinAmount = chainlistAsset.minAmount || '0';
  const chainlistDecimals = chainlistAsset.decimals || 0;
  const chainlistSymbol = chainlistAsset.symbol;

  console.log(`[i] minAmount: current - ${chainlistMinAmount}, onchain - ${minAmount}`);
  console.log(`[i] decimals: current - ${chainlistDecimals}, onchain - ${decimals}`);
  console.log(`[i] symbol: current - ${chainlistSymbol}, onchain - ${symbol}`);

  const isValidSymbol = symbol === chainlistSymbol ? true : 'zk' + symbol === chainlistSymbol;
  const isValidMinAmount = minAmount === chainlistMinAmount;
  const isValidDecimal = decimals === chainlistDecimals;

  return (isValidSymbol && isValidMinAmount && isValidDecimal);
};
