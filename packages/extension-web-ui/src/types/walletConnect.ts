// Copyright 2019-2022 @subwallet/extension-web-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountChainType } from '@subwallet/extension-base/types';
import { ChainInfo } from '@subwallet/extension-web-ui/types/chain';

export interface WalletConnectChainInfo {
  chainInfo: ChainInfo | null;
  slug: string;
  supported: boolean;
  accountType?: AccountChainType;
  wcChain: string;
}
