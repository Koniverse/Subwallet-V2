// Copyright 2019-2022 @subwallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainInfo } from '@subwallet/chain-list/types';
import { MetadataItem } from '@subwallet/extension-base/background/KoniTypes';
import { metadataExpand } from '@subwallet/extension-chains/bundle';
import { MetadataDef } from '@subwallet/extension-inject/types';

import { Metadata, TypeRegistry } from '@polkadot/types';
import { ChainProperties } from '@polkadot/types/interfaces';
import { Registry, SignerPayloadJSON } from '@polkadot/types/types';

import KoniState from './handlers/State';

export enum MetadataSource {
  API = 'api',
  DB = 'db',
  DAPP = 'dapp'
}

export interface MetadataWithSource{
  metadata: MetadataDef | MetadataItem | undefined;
  source: MetadataSource;
}

export interface CachedChainProperties {
  ss58Format: number;
  tokenDecimals: number | undefined;
  tokenSymbol: string | undefined;
}

const cachedChainProperties: Map<string, Promise<CachedChainProperties | null>> = new Map();

function getChainProperties (chainInfo: _ChainInfo, genesisHash: string): Promise<CachedChainProperties | null> {
  const cachedPromise = cachedChainProperties.get(genesisHash);

  if (cachedPromise) {
    return cachedPromise;
  }

  const chainPropertiesPromise = new Promise<CachedChainProperties | null>((resolve) => {
    const chainProperties: CachedChainProperties = {
      ss58Format: chainInfo?.substrateInfo?.addressPrefix ?? 42,
      tokenDecimals: chainInfo?.substrateInfo?.decimals,
      tokenSymbol: chainInfo?.substrateInfo?.symbol
    };

    cachedChainProperties.set(genesisHash, Promise.resolve(chainProperties));
    resolve(chainProperties);
  });

  cachedChainProperties.set(genesisHash, chainPropertiesPromise);

  return chainPropertiesPromise;
}

export function getSuitableRegistry (metadatas: MetadataWithSource[], payload: SignerPayloadJSON, chainInfo: _ChainInfo | undefined, koniState: KoniState) {
  const api = chainInfo ? koniState.getSubstrateApi(chainInfo.slug).api : undefined;
  const apiSpecVersion = api?.runtimeVersion.specVersion.toString();
  const payloadSpecVersion = parseInt(payload.specVersion);
  const extendedMetadatas = [{
    metadata: { specVersion: apiSpecVersion },
    source: MetadataSource.API
  },
  ...metadatas
  ];

  const sortedMetadatas = extendedMetadatas
    .filter((meta): meta is MetadataWithSource => meta.metadata !== undefined)
    .map((meta) => ({
      meta: meta.metadata,
      source: meta.source,
      distance: Math.abs(Number(meta.metadata?.specVersion) - payloadSpecVersion),
      isHigher: Number(meta.metadata?.specVersion) >= payloadSpecVersion
    }))
    .sort((a, b) => {
      if (a.distance !== b.distance) {
        return a.distance - b.distance;
      }

      return Number(b.meta?.specVersion) - Number(a.meta?.specVersion);
    });

  const closestMetadata = sortedMetadatas[0];
  let registry: Registry;

  if (closestMetadata.source === MetadataSource.API) {
    registry = api?.registry as unknown as TypeRegistry;
  } else if (closestMetadata.source === MetadataSource.DB && chainInfo) {
    registry = setupDatabaseRegistry(closestMetadata.meta as MetadataItem, chainInfo, payload);
  } else {
    registry = setupDappRegistry(closestMetadata.meta as MetadataDef, payload);
  }

  return registry;
}

export function setupDatabaseRegistry (metadata: MetadataItem, chainInfo: _ChainInfo, payload: SignerPayloadJSON) {
  const registry = new TypeRegistry();
  const _metadata = new Metadata(registry, metadata.hexValue);

  const chainProperties = getChainProperties(chainInfo, payload.genesisHash);

  registry.register(metadata.types);
  registry.setChainProperties(registry.createType('ChainProperties', chainProperties) as unknown as ChainProperties);
  registry.setMetadata(_metadata, payload.signedExtensions, metadata.userExtensions);

  return registry;
}

export function setupDappRegistry (metadata: MetadataDef, payload: SignerPayloadJSON) {
  const expanded = metadataExpand(metadata, false);
  const registry = expanded.registry;

  registry.setSignedExtensions(payload.signedExtensions, expanded.definition.userExtensions);

  return registry;
}
