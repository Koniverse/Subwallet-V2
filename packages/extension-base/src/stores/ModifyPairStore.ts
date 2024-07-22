// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { EXTENSION_PREFIX } from '@subwallet/extension-base/defaults';
import SubscribableStore from '@subwallet/extension-base/stores/SubscribableStore';
import { ModifyPairStoreData } from '@subwallet/extension-base/types';

export default class ModifyPairStore extends SubscribableStore<ModifyPairStoreData> {
  constructor () {
    super(EXTENSION_PREFIX ? `${EXTENSION_PREFIX}pair_modify` : null);
  }
}
