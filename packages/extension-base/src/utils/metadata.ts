// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { ChainService } from '@subwallet/extension-base/services/chain-service';
import { _SubstrateApi } from '@subwallet/extension-base/services/chain-service/types';

import { ApiPromise } from '@polkadot/api';
import { TypeRegistry } from '@polkadot/types';
import { getSpecExtensions, getSpecTypes } from '@polkadot/types-known';
import { formatBalance, isNumber, u8aToHex } from '@polkadot/util';
import { HexString } from '@polkadot/util/types';
import { defaults as addressDefaults } from '@polkadot/util-crypto/address/defaults';
import { ExtraInfo, merkleizeMetadata } from '@polkadot-api/merkleize-metadata';

interface Statics {
  api: ApiPromise;
  registry: TypeRegistry;
}

export const statics = {
  api: undefined,
  registry: new TypeRegistry()
} as unknown as Statics;

export const DEFAULT_DECIMALS = statics.registry.createType('u32', 12);
export const DEFAULT_SS58 = statics.registry.createType('u32', addressDefaults.prefix);

export const _isRuntimeUpdated = (signedExtensions?: string[]): boolean => {
  return signedExtensions ? signedExtensions.includes('CheckMetadataHash') : false;
};

export const calculateMetadataHash = (extraInfo: ExtraInfo, metadataV15: HexString): string => {
  const _merkleizeMetadata = merkleizeMetadata(metadataV15, extraInfo);

  return u8aToHex(_merkleizeMetadata.digest());
};

export const getShortMetadata = (blob: HexString, extraInfo: ExtraInfo, metadata: HexString): string => {
  const _merkleizeMetadata = merkleizeMetadata(metadata, extraInfo);

  return u8aToHex(_merkleizeMetadata.getProofForExtrinsicPayload(blob));
};

const updateMetadataV15 = async (chain: string, api: ApiPromise, chainService?: ChainService): Promise<void> => {
  try {
    const currentSpecVersion = api.runtimeVersion.specVersion.toString();
    const genesisHash = api.genesisHash.toHex();
    const metadata = await chainService?.getMetadataV15(chain);

    // Avoid date existed metadata
    if (metadata && metadata.specVersion === currentSpecVersion && metadata.genesisHash === genesisHash) {
      return;
    }

    if (api.call.metadata.metadataAtVersion) {
      const metadataV15 = await api.call.metadata.metadataAtVersion(15);

      if (!metadataV15.isEmpty) {
        const hexV15 = metadataV15.unwrap().toHex();
        const updateMetadata = {
          chain: chain,
          genesisHash: genesisHash,
          specVersion: currentSpecVersion,
          hexV15
        };

        chainService?.upsertMetadataV15(chain, { ...updateMetadata }).catch(console.error);
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
};

const updateMetadata = async (
  chain: string,
  api: ApiPromise,
  chainService?: ChainService
) => {
  const currentSpecVersion = api.runtimeVersion.specVersion.toString();
  const genesisHash = api.genesisHash.toHex();
  const specName = api.runtimeVersion.specName.toString();
  const metadata = await chainService?.getMetadata(chain);

  // Avoid date existed metadata
  if (metadata && metadata.specVersion === currentSpecVersion && metadata.genesisHash === genesisHash) {
    return;
  }

  const systemChain = api.runtimeChain;
  const metadataHex = api.runtimeMetadata.toHex();
  const registry = api.registry;

  const tokenInfo = {
    ss58Format: isNumber(registry.chainSS58)
      ? registry.chainSS58
      : DEFAULT_SS58.toNumber(),
    tokenDecimals: (registry.chainDecimals || [DEFAULT_DECIMALS.toNumber()])[0],
    tokenSymbol: (registry.chainTokens || formatBalance.getDefaults().unit)[0]
  };

  const updateMetadata = {
    chain: chain,
    genesisHash: genesisHash,
    specName: specName,
    specVersion: currentSpecVersion,
    hexValue: metadataHex,
    types: getSpecTypes(api.registry, systemChain, api.runtimeVersion.specName, api.runtimeVersion.specVersion) as unknown as Record<string, string>,
    userExtensions: getSpecExtensions(api.registry, systemChain, api.runtimeVersion.specName),
    tokenInfo
  };

  chainService?.upsertMetadata(chain, { ...updateMetadata }).catch(console.error);
};

export const cacheMetadata = (
  chain: string,
  substrateApi: _SubstrateApi,
  chainService?: ChainService
): void => {
  // Update metadata to database with async methods
  substrateApi.api.isReady.then((api) => {
    updateMetadata(chain, api, chainService).catch(console.error);
    updateMetadataV15(chain, api, chainService).catch(console.error);
  }).catch(console.error);
};
