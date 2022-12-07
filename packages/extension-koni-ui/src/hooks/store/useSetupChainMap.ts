// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainInfo } from '@subwallet/extension-koni-base/services/chain-service/types';
import { subscribeChainMap } from '@subwallet/extension-koni-ui/messaging';
import { store } from '@subwallet/extension-koni-ui/stores';
import { useEffect } from 'react';

function updateChainMap (data: Record<string, _ChainInfo>): void {
  store.dispatch({ type: 'chainMap/update', payload: data });
}

export default function useSetupChainMap () {
  useEffect((): void => {
    console.log('--- Setup redux: ChainInfo');
    subscribeChainMap(updateChainMap)
      .then(updateChainMap)
      .catch(console.error);
  }, []);
}
