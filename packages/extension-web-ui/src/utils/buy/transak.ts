// Copyright 2019-2022 @subwallet/extension-web-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { TRANSAK_API_KEY, TRANSAK_URL } from '@subwallet/extension-web-ui/constants';
import { CreateBuyOrderFunction } from '@subwallet/extension-web-ui/types';
import qs from 'querystring';

export const createTransakOrder: CreateBuyOrderFunction = (symbol, address, network, slug, walletReference, action) => {
  return new Promise((resolve) => {
    const params: any = {
      apiKey: '307807a5-5fb3-4add-8a6c-fca4972e0470',
      defaultCryptoCurrency: 'USDT',
      networks: 'ethereum',
      cryptoCurrencyList: 'USDT',
      productsAvailed: action
    };
    if(action === 'BUY'){
      params.walletAddress = address;
    } else {
      params.partnerCustomerId = address;
      params.redirectURL = `http://192.168.10.213:9000/off-ramp-loading?slug=${slug}`;
      params.walletRedirection = true;
    }

    const query = qs.stringify(params);

    resolve(`${TRANSAK_URL}?${query}`);
  });
};
