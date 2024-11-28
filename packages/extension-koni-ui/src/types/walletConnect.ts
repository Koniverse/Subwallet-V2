// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountChainType } from '@subwallet/extension-base/types';
import { ChainInfo } from '@subwallet/extension-koni-ui/types/chain';

export interface WalletConnectChainInfo {
  chainInfo: ChainInfo | null;
  slug: string;
  supported: boolean;
  accountType?: AccountChainType;
  wcChain: string;
}
