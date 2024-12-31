// Copyright 2019-2022 @subwallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { EXTENSION_PREFIX } from '@subwallet/extension-base/defaults';
import { AuthUrls } from '@subwallet/extension-base/services/request-service/types';
import SubscribableStore from '@subwallet/extension-base/stores/SubscribableStore';

export default class AuthorizeStore extends SubscribableStore<AuthUrls> {
  constructor () {
    super(EXTENSION_PREFIX ? `${EXTENSION_PREFIX}authorize` : null);
  }
}
