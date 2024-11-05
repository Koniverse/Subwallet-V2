// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { StoreSubject } from '@subwallet/extension-base/services/keyring-service/context/stores/Base';
import ChainlistStore from '@subwallet/extension-base/stores/ChainlistStore';
import { BehaviorSubject } from 'rxjs';

interface ChainlistConfig {
  patchVersion: string
}

export class ChainlistStoreSubject extends StoreSubject<ChainlistConfig> {
  store = new ChainlistStore();
  subject = new BehaviorSubject<ChainlistConfig>({ patchVersion: '' });
  key = 'Chainlist';
  defaultValue = { patchVersion: '' };
}
