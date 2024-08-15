// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { ModifyPairStore } from '@subwallet/extension-base/stores';
import { ModifyPairStoreData } from '@subwallet/extension-base/types';
import { BehaviorSubject } from 'rxjs';

import { StoreSubject } from './Base';

export class ModifyPairStoreSubject extends StoreSubject<ModifyPairStoreData> {
  store = new ModifyPairStore();
  subject = new BehaviorSubject<ModifyPairStoreData>({});
  key = 'ModifyPairs';
  defaultValue = {};
}
