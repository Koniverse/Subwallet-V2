// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { AccountProxyStore } from '@subwallet/extension-base/stores';
import { AccountProxyData, AccountProxyStoreData } from '@subwallet/extension-base/types';
import { BehaviorSubject } from 'rxjs';

import { StoreSubject } from './Base';

export class AccountProxyStoreSubject extends StoreSubject<AccountProxyStoreData> {
  store = new AccountProxyStore();
  subject = new BehaviorSubject<AccountProxyStoreData>({});
  key = 'AccountProxies';
  defaultValue = {};

  public upsertByKey (data: AccountProxyData, callback?: () => void) {
    const proxyData = this.value;

    proxyData[data.id] = data;

    this.upsertData(proxyData, callback);
  }

  public deleteByKey (key: string, callback?: () => void) {
    const proxyData = this.value;

    delete proxyData[key];

    this.upsertData(proxyData, callback);
  }

  public clear () {
    this.upsertData({});
  }
}
