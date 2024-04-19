// Copyright 2019-2022 @subwallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

export const HIRO_API = {
  api_status: 'https://api.hiro.so/ordinals/v1/',

  list_of_incriptions: 'https://api.hiro.so/ordinals/v1/inscriptions',
  transfers_per_block: 'https://api.hiro.so/ordinals/v1/inscriptions/transfers',
  specific_inscription: 'https://api.hiro.so/ordinals/v1/inscriptions/:id',
  inscription_content: 'https://api.hiro.so/ordinals/v1/inscriptions/:id/content',
  inscription_transfers: 'https://api.hiro.so/ordinals/v1/inscriptions/:id/transfers',

  satoshi_ordinal: 'https://api.hiro.so/ordinals/v1/sats/:ordinal',
  satoshi_inscriptions: 'https://api.hiro.so/ordinals/v1/sats/:ordinal/inscriptions',

  inscription_count_per_block: 'https://api.hiro.so/ordinals/v1/stats/inscriptions',

  brc20_tokens: 'https://api.hiro.so/ordinals/v1/brc-20/tokens',
  brc20_token_details: 'https://api.hiro.so/ordinals/v1/brc-20/tokens/:ticker',
  brc20_token_holders: 'https://api.hiro.so/ordinals/v1/brc-20/tokens/:ticker/holders',
  brc20_balances: 'https://api.hiro.so/ordinals/v1/brc-20/balances/:address',
  brc20_activity: 'https://api.hiro.so/ordinals/v1/brc-20/activity'
};

export const ORD_IO_URL = {
  url: 'https://www.ord.io/'
};

export const SUPPORT_SRC_VIEWER = {
  inscription_info_url: 'https://ordinals.hiro.so/inscription/:id',
  frame_preview_url: 'https://ordinals.com/preview/:id'
};
