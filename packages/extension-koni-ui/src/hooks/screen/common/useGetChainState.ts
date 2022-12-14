// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { RootState } from '@subwallet/extension-koni-ui/stores';
import { useSelector } from 'react-redux';

export default function useGetChainState (key: string) {
  const chainInfoMap = useSelector((state: RootState) => state.chainStateMap);

  return chainInfoMap[key];
}
