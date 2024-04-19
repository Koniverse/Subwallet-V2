// Copyright 2019-2022 @subwallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

export interface Inscription {
  id: string;
  number: number;
  address: string;
  block: number;
  block_hash: string;
  timestamp: number;
  tx_id: string;
  location: string;
  output: string;
  value: number;
  fee: number;
  sat_ordinal: number;
  sat_rarity: string;
  content_type: string;
  content_length: number;
  content: any;
}

// all metadata return from Hiro
export interface InscriptionResponseItem {
  address: string;
  content_length: number;
  content_type: string;
  curse_type: string | null;
  genesis_address: string;
  genesis_block_hash: string;
  genesis_block_height: number;
  genesis_fee: string;
  genesis_timestamp: number;
  genesis_tx_id: string;
  id: string;
  location: string;
  mime_type: string;
  number: number;
  offset: string;
  output: string;
  recursive: boolean;
  recursion_refs: string | null;
  sat_coinbase_height: number;
  sat_ordinal: string;
  sat_rarity: string;
  timestamp: number;
  tx_id: string;
  value: string;
}
