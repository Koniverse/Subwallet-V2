// Copyright 2019-2022 @subwallet/extension-web-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { TRANSAK_API_KEY, TRANSAK_URL } from '@subwallet/extension-web-ui/constants';
import { CreateBuyOrderFunction } from '@subwallet/extension-web-ui/types';
import qs from 'querystring';

export const createTransakOrder: CreateBuyOrderFunction = (orderParams) => {
  const { action = 'BUY', address, network, slug = '', symbol } = orderParams;

  return new Promise((resolve) => {
    const location = window.location.origin;
    const params: Record<string, string | number | boolean | null> = {
      apiKey: TRANSAK_API_KEY,
      defaultCryptoCurrency: symbol,
      networks: network,
      cryptoCurrencyList: symbol,
      productsAvailed: action || 'BUY'
    };

    if (action === 'BUY') {
      params.walletAddress = address;
    } else {
      params.partnerCustomerId = address;
      params.redirectURL = `${location}/off-ramp-loading?slug=${slug ?? ''}`;
      params.walletRedirection = true;
    }

    const query = qs.stringify(params);

    resolve(`${TRANSAK_URL}?${query}`);
  });
};
