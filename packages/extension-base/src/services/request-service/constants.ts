// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

export const EXTENSION_REQUEST_URL = 'extension';

export const WEB_APP_URL = ['localhost:9000'];

export const PREDEFINED_CHAIN_DAPP_CHAIN_MAP: Record<string, string[]> = {
  'portal.astar.network': ['astar', 'astarEvm'],
  'apps.moonbeam.network': ['moonbeam', 'moonriver'],
  'app.stellaswap.com': ['moonbeam']
};
