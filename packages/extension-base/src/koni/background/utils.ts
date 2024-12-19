// Copyright 2019-2022 @subwallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainInfo } from '@subwallet/chain-list/types';
import { MetadataItem } from '@subwallet/extension-base/background/KoniTypes';
import { metadataExpand } from '@subwallet/extension-chains/bundle';
import { MetadataDef } from '@subwallet/extension-inject/types';

import { Metadata, TypeRegistry } from '@polkadot/types';
import { ChainProperties } from '@polkadot/types/interfaces';
import { SignerPayloadJSON } from '@polkadot/types/types';

export enum MetadataSource {
  API = 'api',
  DB = 'db',
  DAPP = 'dapp'
}

export interface MetadataWithSource{
  metadata: MetadataDef | MetadataItem | undefined;
  source: MetadataSource;
}

export function getSuitableMetadata (metadatas: MetadataWithSource[], payloadSpecVersion: number) {
  const sortedMetadatas = metadatas
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

  return {
    metadata: sortedMetadatas[0].meta,
    source: sortedMetadatas[0].source
  };
}

export function setupDatabaseRegistry (metadata: MetadataItem, chainInfo: _ChainInfo, payload: SignerPayloadJSON) {
  const registry = new TypeRegistry();
  const _metadata = new Metadata(registry, metadata.hexValue);

  registry.register(metadata.types);
  registry.setChainProperties(registry.createType('ChainProperties', {
    ss58Format: chainInfo?.substrateInfo?.addressPrefix ?? 42,
    tokenDecimals: chainInfo?.substrateInfo?.decimals,
    tokenSymbol: chainInfo?.substrateInfo?.symbol
  }) as unknown as ChainProperties);
  registry.setMetadata(_metadata, payload.signedExtensions, metadata.userExtensions);

  return registry;
}

export function setupDappRegistry (metadata: MetadataDef, payload: SignerPayloadJSON) {
  const expanded = metadataExpand(metadata, false);
  const registry = expanded.registry;

  registry.setSignedExtensions(payload.signedExtensions, expanded.definition.userExtensions);

  return registry;
}
