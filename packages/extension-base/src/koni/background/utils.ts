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

export interface RegistrySource{
  registry: Registry,
  specVersion: string | number,
}

export function getSuitableRegistry (registries: RegistrySource[], payload: SignerPayloadJSON) {
  const payloadSpecVersion = parseInt(payload.specVersion);
  const sortedRegistries = registries
    .filter((registrySource): registrySource is RegistrySource => registrySource.registry !== undefined)
    .map((registrySource) => {
      const specVersion = Number(registrySource.specVersion);
      const distance = Math.abs(specVersion - payloadSpecVersion);
      const isHigher = specVersion >= payloadSpecVersion;

      return {
        registry: registrySource.registry,
        specVersion,
        distance,
        isHigher
      };
    })
    .sort((a, b) => {
      if (a.distance !== b.distance) {
        return a.distance - b.distance;
      }

      return b.specVersion - a.specVersion;
    });

  return sortedRegistries[0].registry;
}

export function setupApiRegistry (chainInfo: _ChainInfo | undefined, koniState: KoniState): RegistrySource | null {
  if (!chainInfo) {
    return null;
  }

  const api = koniState.getSubstrateApi(chainInfo.slug).api;
  const apiSpecVersion = api?.runtimeVersion.specVersion.toString();
  const registry = api?.registry as unknown as TypeRegistry;

  return {
    registry,
    specVersion: apiSpecVersion
  };
}

export function setupDatabaseRegistry (metadata: MetadataItem, chainInfo: _ChainInfo | undefined, payload: SignerPayloadJSON): RegistrySource | null {
  if (!metadata || !metadata.genesisHash || !chainInfo) {
    return null;
  }

  const registry = new TypeRegistry();
  const _metadata = new Metadata(registry, metadata.hexValue);

  registry.register(metadata.types);
  registry.setChainProperties(registry.createType('ChainProperties', metadata.tokenInfo) as unknown as ChainProperties);
  registry.setMetadata(_metadata, payload.signedExtensions, metadata.userExtensions);

  return {
    registry,
    specVersion: metadata.specVersion
  };
}

export function setupDappRegistry (metadata: MetadataDef, payload: SignerPayloadJSON): RegistrySource | null {
  if (!metadata || !metadata.genesisHash) {
    return null;
  }

  const expanded = metadataExpand(metadata, false);
  const registry = expanded.registry;

  registry.setSignedExtensions(payload.signedExtensions, expanded.definition.userExtensions);

  return {
    registry,
    specVersion: metadata.specVersion
  };
}
