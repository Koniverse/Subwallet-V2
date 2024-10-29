// Copyright 2019-2022 @subwallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NftCollection, NftItem } from '@subwallet/extension-base/background/KoniTypes';
import { _SubstrateApi } from '@subwallet/extension-base/services/chain-service/types';
import { baseParseIPFSUrl } from '@subwallet/extension-base/utils';

import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';

import { TERNOA_MAINNET_CLIENT_NFT, TERNOA_MAINNET_GATEWAY } from '../config';
import { BaseNftApi, HandleNftParams } from '../nft';

interface NftMetadata {
  nftId: string;
  owner: string;
  creator: string;
  collectionId: string;
  offchainData: string;
}

interface NftDetail {
  title: string;
  description: string;
  image: string;
}

interface CollectionMetadata {
  offchainData: string;
}

interface CollectionDetail {
  name: string;
  banner_image: string;
}

interface FetchResponse {
  data: {
    nftEntities: {
      nodes: NftMetadata[] | null;
    };
  };
}

export class TernoaNftApi extends BaseNftApi {
  constructor (api: _SubstrateApi | null, addresses: string[], chain: string) {
    super(chain, api, addresses);
  }

  endpoint = TERNOA_MAINNET_CLIENT_NFT;

  override parseUrl (input: string): string | undefined {
    return baseParseIPFSUrl(input, TERNOA_MAINNET_GATEWAY);
  }

  private static parseNftRequest (address: string) {
    return {
      query: `
            query {
                nftEntities(
                    filter: {
                        owner: { equalTo: "${address}" }
                    }
                ) {
                  totalCount
                  nodes {
                    nftId
                    owner
                    creator
                    collectionId
                    offchainData
                  }
                }
              }`
    };
  }

  /* GET NFTs */

  public async fetchNftsWithDetail (address: string): Promise<Array<{ metadata: NftMetadata; detail: NftDetail }> | null> {
    const query = TernoaNftApi.parseNftRequest(address);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query)
      });

      const result = await response.json() as FetchResponse;
      const nftEntities = result.data.nftEntities.nodes;

      if (!nftEntities) {
        return null;
      }

      const nftDetails = await Promise.all(nftEntities.map(async (nft) => {
        const ipfsUrl = `${TERNOA_MAINNET_GATEWAY}${nft.offchainData}`;

        try {
          const ipfsResponse = await fetch(ipfsUrl);
          const nftDetail = await ipfsResponse.json() as NftDetail;

          nftDetail.image = `${TERNOA_MAINNET_GATEWAY}${nftDetail.image}`;

          return { metadata: nft, detail: nftDetail };
        } catch (err) {
          console.error('Error:', err);

          return null;
        }
      }));

      return nftDetails.filter((nft) => nft !== null) as Array<{ metadata: NftMetadata; detail: NftDetail }>;
    } catch (err) {
      console.error('Error:', err);

      return null;
    }
  }

  /* GET NFTs */

  /* GET Collection */

  public async getCollectionDetail (collectionId: string): Promise<CollectionDetail | null> {
    if (!this.substrateApi) {
      return null;
    }

    const substrateApi = await this.substrateApi.isReady;

    try {
      const collectionMetadata = (await substrateApi.api.query.nft.collections(parseInt(collectionId))).toHuman() as unknown as CollectionMetadata;

      if (!collectionMetadata?.offchainData) {
        return null;
      }

      const ipfsUrl = `${TERNOA_MAINNET_GATEWAY}${collectionMetadata.offchainData}`;
      const ipfsResponse = await fetch(ipfsUrl);

      if (!ipfsResponse.ok) {
        return {
          name: collectionMetadata.offchainData,
          banner_image: ''
        };
      }

      const collectionDetail = await ipfsResponse.json() as CollectionDetail;

      collectionDetail.banner_image = `${TERNOA_MAINNET_GATEWAY}${collectionDetail.banner_image}`;

      return collectionDetail;
    } catch (err) {
      console.error('Error:', err);

      return null;
    }
  }

  /* Get Collection */

  public async handleNfts (params: HandleNftParams): Promise<void> {
    const collectionMap = new Map<string, boolean>();

    await Promise.all(this.addresses.map(async (address) => {
      address = encodeAddress(decodeAddress(address), 42);
      const nftDetails = await this.fetchNftsWithDetail(address);

      if (!nftDetails || nftDetails.length === 0) {
        return;
      }

      // eslint-disable-next-line @typescript-eslint/require-await
      await Promise.all(nftDetails.map(async (nft) => {
        const { detail, metadata } = nft;

        let collectionId = metadata.collectionId;

        if (!collectionId) {
          collectionId = 'Ternoa_Collection';
        }

        const parsedNft = {
          id: metadata.nftId,
          name: detail.title,
          description: detail.description,
          image: detail.image ? this.parseUrl(detail.image) : undefined,
          collectionId,
          chain: this.chain,
          owner: address
        } as NftItem;

        params.updateItem(this.chain, parsedNft, address);

        if (!collectionMap.has(collectionId)) {
          collectionMap.set(collectionId, true);
        }
      }));
    }));

    for (const collectionId of collectionMap.keys()) {
      const collectionDetail = collectionId !== 'Ternoa_Collection'
        ? await this.getCollectionDetail(collectionId)
        : {
          name: 'Ternoa NFTs',
          description: 'Collection for NFTs without a specific collection',
          banner_image: ''
        };

      const parsedCollection = {
        collectionId,
        chain: this.chain,
        collectionName: collectionDetail?.name,
        image: collectionDetail?.banner_image ? this.parseUrl(collectionDetail?.banner_image) : undefined
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
