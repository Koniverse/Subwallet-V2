// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { EXTENSION_PREFIX } from '@subwallet/extension-base/defaults';
import SubscribableStore from '@subwallet/extension-base/stores/SubscribableStore';
import { AccountProxyStoreData } from '@subwallet/extension-base/types';

export default class AccountProxyStore extends SubscribableStore<AccountProxyStoreData> {
  constructor () {
    super(EXTENSION_PREFIX ? `${EXTENSION_PREFIX}account_proxy` : null);
  }
}
