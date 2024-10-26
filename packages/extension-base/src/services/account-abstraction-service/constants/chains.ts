// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { AAProvider, AAProviderConfig } from '@subwallet/extension-base/types';
import { genProviderConfigKey } from '@subwallet/extension-base/utils';

export const PROVIDER_SUPPORTED_CHAINS: Record<string, bigint[]> = {
  [genProviderConfigKey(AAProvider.KLASTER, 'BICONOMY', '2.0.0')]: [1n, 10n, 11155111n, 137n, 42161n, 421614n, 43114n, 534352n, 56n, 8453n, 84532n],
  [genProviderConfigKey(AAProvider.PARTICLE, 'BICONOMY', '1.0.0')]: [
    1n,
    11155111n,
    137n,
    56n,
    97n,
    421614n,
    10n,
    43114n,
    8453n,
    84532n,
    1101n
  ],
  [genProviderConfigKey(AAProvider.PARTICLE, 'BICONOMY', '2.0.0')]: [
    1n,
    11155111n,
    137n,
    56n,
    97n,
    421614n,
    10n,
    43114n,
    8453n,
    84532n,
    59144n,
    5000n,
    169n,
    1284n,
    1287n,
    7001n,
    534352n,
    81457n,
    1101n
  ],
  [genProviderConfigKey(AAProvider.PARTICLE, 'SIMPLE', '1.0.0')]: [
    1n,
    11155111n,
    137n,
    56n,
    97n,
    421614n,
    10n,
    43114n,
    8453n,
    84532n,
    59144n,
    5000n,
    169n,
    1284n,
    1287n,
    7001n,
    534352n,
    81457n,
    1101n,
    250n,
    4002n,
    200901n,
    200810n,
    3776n,
    88n,
    1285n,
    995n,
    6322n,
    1513n,
    1946n
  ],
  [genProviderConfigKey(AAProvider.PARTICLE, 'CYBERCONNECT', '1.0.0')]: [
    1n,
    11155111n,
    137n,
    56n,
    97n,
    421614n,
    10n,
    8453n,
    84532n,
    59144n,
    5000n,
    534352n
  ],
  [genProviderConfigKey(AAProvider.PARTICLE, 'LIGHT', '1.0.2')]: [
    1n,
    11155111n,
    137n,
    10n,
    8453n,
    84532n
  ],
  [genProviderConfigKey(AAProvider.PARTICLE, 'COINBASE', '1.0.0')]: [
    1n,
    11155111n,
    137n,
    10n,
    43114n,
    8453n,
    84532n,
    59144n
  ]
};

export const getSupportedChainIds = (provider: AAProvider, config: AAProviderConfig): bigint[] => {
  return PROVIDER_SUPPORTED_CHAINS[genProviderConfigKey(provider, config.name, config.version)] || [];
};
