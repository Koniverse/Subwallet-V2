// Copyright 2019-2022 @subwallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NftCollection, NftItem } from '@subwallet/extension-base/background/KoniTypes';

import { BaseNftApi, HandleNftParams } from '../nft';

const options = {
  method: 'GET',
  headers: {
    accept: 'application/json',
    'X-API-KEY': 'ed9df6bf-7eba-4ca2-8a42-9006706be064'
  }
};

interface NftResponse {
  items: ItemData[];
}

interface ItemData {
  collection: string;
  id: string;
  meta: MetaData;
  tokenId: string;
  itemCollection: CollectionData;
}

interface MetaData {
  content: Content[];
  description?: string;
  name: string;
}

interface Content {
  url: string;
}

interface CollectionData {
  name: string
}

export class RariNftApi extends BaseNftApi {
  constructor (chain: string, addresses: string[]) {
    super(chain, undefined, addresses);
  }

  private wait (ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public async handleNfts (params: HandleNftParams): Promise<void> {
    const collectionMap = new Map<string, string>();
    const size = 4;
    const waitTime = 1000;

    for (let i = 0; i < this.addresses.length; i += size) {
      const group = this.addresses.slice(i, i + size);

      await Promise.all(group.map(async (address) => {
        const nftResponse = await fetch(
          `https://api.rarible.org/v0.1/items/byOwner?blockchains=RARI&owner=ETHEREUM%3A${address}&size=5000`,
          options
        )
          .then((response) => response.json())
          .catch((err) => {
            console.error(err);

            return null;
          }) as NftResponse;

        if (!nftResponse || !nftResponse.items) {
          return;
        }

        const nftItems = nftResponse.items;

        // eslint-disable-next-line @typescript-eslint/require-await
        await Promise.all(nftItems.map(async (nft) => {
          const collectionId = nft.collection;
          const collectionName = nft.itemCollection.name;
          const NftMetadata = nft.meta;
          const NFTimageUrl = NftMetadata.content[0]?.url || '';
          const formatCollectionId = collectionId.replace(/^RARI:/, '');

          const parsedNft = {
            id: nft.tokenId,
            name: NftMetadata.name,
            description: NftMetadata.description || '',
            image: NFTimageUrl,
            collectionId: formatCollectionId,
            chain: this.chain,
            owner: address
          } as NftItem;

          params.updateItem(this.chain, parsedNft, address);

          if (!collectionMap.has(formatCollectionId)) {
            collectionMap.set(formatCollectionId, collectionName);
          }
        }));
      }));

      if (i + size < this.addresses.length) {
        await this.wait(waitTime);
      }
    }

    for (const [formatCollectionId, collectionName] of collectionMap.entries()) {
      const parsedCollection = {
        collectionId: formatCollectionId,
        chain: this.chain,
        collectionName,
        image: ''
      } as NftCollection;

      params.updateCollection(this.chain, parsedCollection);
    }
  }

  public async fetchNfts (params: HandleNftParams): Promise<number> {
    try {
      await this.handleNfts(params);
    } catch (e) {
      return 0;
    }

    return 1;
  }
}
