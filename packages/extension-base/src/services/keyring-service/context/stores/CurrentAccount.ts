// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { CurrentAccountStore } from '@subwallet/extension-base/stores';
import { CurrentAccountInfo } from '@subwallet/extension-base/types';
import { BehaviorSubject } from 'rxjs';

import { StoreSubject } from './Base';

export class CurrentAccountStoreSubject extends StoreSubject<CurrentAccountInfo> {
  store = new CurrentAccountStore();
  subject = new BehaviorSubject<CurrentAccountInfo>({ proxyId: '' });
  key = 'CurrentAccountInfo';
  defaultValue = { proxyId: '' };

  override transformInitData (rs: CurrentAccountInfo) {
    return rs ? { proxyId: rs.proxyId || rs.address || '' } : this.defaultValue;
  }
}
