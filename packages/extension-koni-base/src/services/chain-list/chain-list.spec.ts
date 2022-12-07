// Copyright 2019-2022 @subwallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Chain, ChainProvider } from '@subwallet/extension-koni-base/services/chain-list/index';

describe('test ChainList', () => {
  test('test get chains', () => {
    console.log('Chains: ', Chain[1]);
    Object.values(ChainProvider).forEach((chainProvider) => {
      if (chainProvider.chainId_ === 1) {
        console.log(chainProvider);
      }
    });
  });
});
