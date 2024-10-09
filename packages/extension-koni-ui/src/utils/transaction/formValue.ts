// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountProxy } from '@subwallet/extension-base/types';
import { isAccountAll } from '@subwallet/extension-koni-ui/utils';

export const getTransactionFromAccountProxyValue = (currentAccountProxy: AccountProxy | null): string => {
  return currentAccountProxy?.id ? isAccountAll(currentAccountProxy.id) ? '' : currentAccountProxy.id : '';
};
