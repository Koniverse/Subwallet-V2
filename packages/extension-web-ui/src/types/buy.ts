// Copyright 2019-2022 @subwallet/extension-web-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

interface CreateOrderParams {
  symbol: string;
  address: string;
  network: string;
  slug?: string;
  walletReference?: string;
  action?: 'BUY' | 'SELL';
}

export type CreateBuyOrderFunction = (orderParams: CreateOrderParams) => Promise<string>;
