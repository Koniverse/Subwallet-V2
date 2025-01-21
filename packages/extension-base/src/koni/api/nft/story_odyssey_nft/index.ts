// Copyright 2019-2022 @subwallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NftCollection, NftItem } from '@subwallet/extension-base/background/KoniTypes';

import { ODYSSEY_ENDPOINT } from '../config';
import { BaseNftApi, HandleNftParams } from '../nft';

interface OdysseyTokenMetadata {
  name: string;
  image: string;
  description: string;
}

interface OdysseyNftInfo {
  onchain: {
    metadata: OdysseyTokenMetadata;
    token_uri: string;
  };
  offchain: {
    image: {
      url: string;
      content_type: string;
    };
    animation?: object;
  };
}

interface OdysseyToken {
  owner: string;
  token_id: string;
  media_info: OdysseyNftInfo;
  erc721_contract_address: string;
}

interface OdysseyResponse {
  data: {
    odyssey: {
      erc721_token: OdysseyToken[];
    };
  };
}

interface UrlMetadata {
  name?: string;
  image?: string;
  description?: string;
  media?: [{
    url?: string;
  }];
  title?: string;
}
export class OdysseyNftApi extends BaseNftApi {
  constructor (chain: string, addresses: string[]) {
    super(chain, undefined, addresses);
  }

  endpoint = ODYSSEY_ENDPOINT;

  private static parseNftRequest (address: string): string {
    const lowerCaseAddress = address.toLowerCase();

    return `
      query MyQuery {
        odyssey {
          erc721_token(
            where: {owner: {_eq: "${lowerCaseAddress}"}}
          ) {
            media_info
            owner
            token_id
            erc721_contract_address
          }
        }
      }
    `;
  }

  private async fetchNftData (query: string): Promise<OdysseyToken[] | null> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operationName: 'MyQuery',
          variables: {},
          query
        })
      });

      const result = (await response.json()) as OdysseyResponse;

      return result.data.odyssey.erc721_token;
    } catch (err) {
      console.error('Error:', err);

      return null;
    }
  }

  private async fetchUrlMetadata (url: string): Promise<UrlMetadata | null> {
    try {
      const response = await fetch(url);

      return (await response.json()) as UrlMetadata;
    } catch (err) {
      console.error('Error:', err);

      return null;
    }
  }

  private parseUrlIfIpfs (url: string) {
    if (url.startsWith('ipfs://')) {
      return this.parseUrl(url);
    }

    if (url.includes('github.com')) {
      return `${url}?raw=true`;
    }

    return url;
  }

  private parseNftItem (nft: OdysseyToken, metadata: UrlMetadata | null, address: string): NftItem {
    const urlMetadataImage = this.parseUrlIfIpfs(metadata?.image || '');

    return {
      id: nft.token_id,
      name: metadata?.name || metadata?.title,
      description: metadata?.description,
      image: urlMetadataImage || metadata?.media?.[0]?.url,
      collectionId: nft.erc721_contract_address,
      chain: this.chain,
      owner: address
    };
  }

  private parseNftCollection (nft: OdysseyToken): NftCollection {
    const image = this.parseUrlIfIpfs(nft.media_info.onchain.metadata.image || '');

    return {
      collectionId: nft.erc721_contract_address,
      chain: this.chain,
      collectionName: nft.media_info.onchain.metadata.name,
      image: image || undefined
    };
  }

  private async processNftItem (nft: OdysseyToken, address: string, params: HandleNftParams) {
    const tokenUri = this.parseUrlIfIpfs(nft.media_info.onchain.token_uri) || '';

    const urlMetadata = await this.fetchUrlMetadata(tokenUri);

    const parsedNft = this.parseNftItem(nft, urlMetadata, address);

    params.updateItem(this.chain, parsedNft, address);

    const parsedCollection = this.parseNftCollection(nft);

    params.updateCollection(this.chain, parsedCollection);
  }

  public async handleNfts (params: HandleNftParams) {
    await Promise.all(
      this.addresses.map(async (address) => {
        const nftDetails = await this.fetchNftsWithDetail(address);

        if (!nftDetails || nftDetails.length === 0) {
          return;
        }

        await Promise.all(
          nftDetails.map(async (nft) => {
            await this.processNftItem(nft, address, params);
          })
        );
      })
    );
  }

  public async fetchNftsWithDetail (address: string) {
    const query = OdysseyNftApi.parseNftRequest(address);

    return await this.fetchNftData(query);
  }

  public async fetchNfts (params: HandleNftParams) {
    try {
      await this.handleNfts(params);
    } catch (e) {
      return 0;
    }

    return 1;
  }
}
