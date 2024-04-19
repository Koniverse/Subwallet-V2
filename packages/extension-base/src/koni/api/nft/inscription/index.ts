// Copyright 2019-2022 @subwallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

// eslint-disable-next-line camelcase
import { NftCollection, NftItem } from '@subwallet/extension-base/background/KoniTypes';
// eslint-disable-next-line camelcase
import { HIRO_API } from '@subwallet/extension-base/koni/api/nft/inscription/constant';
import { BaseNftApi, HandleNftParams } from '@subwallet/extension-base/koni/api/nft/nft';
import axios from 'axios';

// const TEST_ADDRESS = 'bc1psu0gqjuyzc5dtcrqu6ewkfe9y94cnm3pjn4vhgem9nr0hzl6w3hqj24zq9';
// const TEST_ADDRESS = 'bc1q8cpn3zl6lz5xrxdqgx7j68ggcpjm7ctzyds82c';
const TEST_ADDRESS = 'bc1p5zy5mrjfz00lr7nvy3vzvusdws85ldxzrqxacgajqwurc70wqsqsdx5ye6';

export class InscriptionApi extends BaseNftApi {
  constructor (chain: string, addresses: string[]) {
    super(chain, undefined, addresses);
  }

  private createInscriptionInfoUrl (id: string) {
    return `https://ordinals.hiro.so/inscription/${id}`;
  }

  private createIframePreviewUrl (id: string) {
    return `https://ordinals.com/preview/${id}`;
  }

  private parseInsUrl (id: string, type: string) {
    if (type.startsWith('audio/') || type.startsWith('text/html') || type.startsWith('image/svg') || type.startsWith('video/') || type.startsWith('model/gltf')) {
      return this.createIframePreviewUrl(id);
    }

    if (type.startsWith('text/')) {
      return this.createInscriptionInfoUrl(id);
    }

    if (type.startsWith('image/')) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions,camelcase
      return `${HIRO_API.list_of_incriptions}/${id}/content`;
    }

    return undefined;
  }

  private async getBalances (address: string) {
    const pageSize = 50;
    let offset = 0;
    const ordinalsFullList: Array<any> = []; // todo: replace type InscriptionResponseItem[]

    const configListOrdinals = {
      method: 'get',
      maxBodyLength: Infinity,
      // eslint-disable-next-line camelcase
      url: HIRO_API.list_of_incriptions + `?address=${address}&limit=${pageSize}&offset=${offset}`,
      headers: {
        Accept: 'application/json'
      }
    };

    try {
      while (true) {
        const response = await axios.request(configListOrdinals);

        // check if response is a null array
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (response.data.results.length !== 0) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-member-access
          ordinalsFullList.push(...response.data.results);
          offset += pageSize;
          // eslint-disable-next-line camelcase
          configListOrdinals.url = HIRO_API.list_of_incriptions + `?address=${address}&limit=${pageSize}&offset=${offset}`;
        } else {
          break;
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return ordinalsFullList;
    } catch (error) {
      console.error(`Failed to get ${address} balances`, error);
      throw error;
    }
  }

  // private async getOrdinalContent (id: string) {
  //   const configContent = {
  //     method: 'get',
  //     maxBodyLength: Infinity,
  //     // eslint-disable-next-line camelcase
  //     url: HIRO_API.inscription_content.replace(':id', id),
  //     headers: {
  //       Accept: 'application/json'
  //     }
  //   };
  //
  //   try {
  //     const response = await axios.request(configContent);
  //
  //     // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  //     return response.data;
  //   } catch (error) {
  //     console.error(`Failed to get content of ordinal with id: ${id}`, error);
  //   }
  // }

  public async handleNfts (params: HandleNftParams) {
    try {
      const balances = await this.getBalances(TEST_ADDRESS);

      console.log('balances', balances);

      // @ts-ignore
      if (balances.length > 0) {
        const collectionMap: Record <string, NftCollection> = {};

        // @ts-ignore
        for (const ins of balances) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
          if (ins.content_type.startsWith('text/plain')) {
            continue;
          }

          const parsedNft: NftItem = {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
            id: ins.id,
            chain: this.chain,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
            owner: '5CUoqFyU2b9dN1JZtPk3qRFVjKu2tQGcf91ZMcMNeH5y35Vb',
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
            name: ins.number,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-member-access
            image: this.parseInsUrl(ins.id, ins.content_type),
            // description: ins.collection_description,
            collectionId: '1'
          };

          console.log('parsedNft', parsedNft);

          params.updateItem(this.chain, parsedNft, '5CUoqFyU2b9dN1JZtPk3qRFVjKu2tQGcf91ZMcMNeH5y35Vb');

          if (!collectionMap['1']) {
            const parsedCollection: NftCollection = {
              collectionId: '1',
              chain: this.chain,
              collectionName: 'DEDMINE',
              image: 'https://ipfs.unique.network/ipfs/Qmdz4bBw8HjK4iWevx8bz46t2dzdSspdcFaiFvHDaCmD9g'
            };

            collectionMap['1'] = parsedCollection;
            params.updateCollection(this.chain, parsedCollection);
            console.log('parsedCollection', parsedCollection);
          }
        }

        // const ordinalPromises: Promise<Inscription | undefined>[] = balances.map(async (ordinal: { id: string; number: any; address: any; genesis_block_height: string; genesis_block_hash: any; genesis_timestamp: any; genesis_tx_id: any; location: any; output: any; value: string; genesis_fee: string; sat_ordinal: string; sat_rarity: any; content_type: any; content_length: any; }) => {
        //   if (ordinal.content_type === 'text/plain') { // todo: this inscription is usually used for the minting, transfering, ... for BRC20. Need recheck.
        //     return undefined;
        //   }
        //
        //   const content = await this.getOrdinalContent(ordinal.id);
        //
        //   return {
        //     id: ordinal.id,
        //     number: ordinal.number,
        //     address: ordinal.address,
        //     block: parseInt(ordinal.genesis_block_height),
        //     block_hash: ordinal.genesis_block_hash,
        //     timestamp: ordinal.genesis_timestamp,
        //     tx_id: ordinal.genesis_tx_id,
        //     location: ordinal.location,
        //     output: ordinal.output,
        //     value: parseInt(ordinal.value),
        //     fee: parseInt(ordinal.genesis_fee),
        //     sat_ordinal: parseInt(ordinal.sat_ordinal),
        //     sat_rarity: ordinal.sat_rarity,
        //     content_type: ordinal.content_type,
        //     content_length: ordinal.content_length,
        //     content: content
        //   };
        // });
        // const ordinal_list = (await Promise.all(ordinalPromises)).filter(Boolean) as Inscription[];
        // const filePath = 'test/output_text/output.json';
        //
        // fs.writeFileSync(filePath, JSON.stringify(ordinal_list, null, 2), 'utf-8');
      }
    } catch (error) {
      console.error('Failed to fetch ordinals', error);
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
