// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import BaseStoreWithChain from '@subwallet/extension-base/services/storage-service/db-stores/BaseStoreWithChain';

import { IMetadataV15Item } from '../databases';

export default class MetadataV15Store extends BaseStoreWithChain<IMetadataV15Item> {
  getMetadata (chain: string) {
    return this.table.where('chain').equals(chain).first();
  }

  upsertMetadata (chain: string, metadata: IMetadataV15Item) {
    return this.table.put(metadata, chain);
  }

  getMetadataByGenesisHash (genesisHash: string) {
    return this.table.get(genesisHash);
  }

  updateMetadataByGenesisHash (genesisHash: string, metadata: IMetadataV15Item) {
    return this.table.put(metadata, genesisHash);
  }
}
