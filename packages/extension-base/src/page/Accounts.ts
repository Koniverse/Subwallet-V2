// Copyright 2019-2022 @polkadot/extension authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { InjectedAccount, InjectedAccounts, Unsubcall } from '@subwallet/extension-inject/types';
import type { SendRequest } from './types';

import { AccountAuthType } from '@subwallet/extension-base/background/types';

// External to class, this.# is not private enough (yet)
let sendRequest: SendRequest;

export default class Accounts implements InjectedAccounts {
  constructor (_sendRequest: SendRequest) {
    sendRequest = _sendRequest;
  }

  public get (anyType?: boolean, accountAuthType = 'substrate'): Promise<InjectedAccount[]> {
    return sendRequest('pub(accounts.listV2)', { anyType, accountAuthType: accountAuthType as AccountAuthType });
  }

  public subscribe (cb: (accounts: InjectedAccount[]) => unknown, accountAuthType = 'substrate'): Unsubcall {
    let id: string | null = null;

    sendRequest('pub(accounts.subscribeV2)', { accountAuthType: accountAuthType as AccountAuthType }, cb)
      .then((subId): void => {
        id = subId;
      })
      .catch(console.error);

    return (): void => {
      id && sendRequest('pub(accounts.unsubscribe)', { id })
        .catch(console.error);
    };
  }
}
