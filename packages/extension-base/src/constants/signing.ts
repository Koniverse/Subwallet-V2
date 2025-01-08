// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ChainType } from '@subwallet/extension-base/background/KoniTypes';
import { AccountChainType } from '@subwallet/extension-base/types';

export const SIGNING_COMPATIBLE_MAP: Record<ChainType, AccountChainType[]> = {
  [ChainType.SUBSTRATE]: [AccountChainType.SUBSTRATE, AccountChainType.ETHEREUM],
  [ChainType.EVM]: [AccountChainType.ETHEREUM],
  [ChainType.BITCOIN]: [AccountChainType.BITCOIN],
  [ChainType.TON]: [AccountChainType.TON],
  [ChainType.CARDANO]: [AccountChainType.CARDANO]
};

export const LEDGER_SIGNING_COMPATIBLE_MAP: Record<ChainType, AccountChainType[]> = {
  [ChainType.SUBSTRATE]: [AccountChainType.SUBSTRATE],
  [ChainType.EVM]: [AccountChainType.ETHEREUM],
  [ChainType.BITCOIN]: [AccountChainType.BITCOIN],
  [ChainType.TON]: [AccountChainType.TON],
  [ChainType.CARDANO]: [AccountChainType.CARDANO]
};
