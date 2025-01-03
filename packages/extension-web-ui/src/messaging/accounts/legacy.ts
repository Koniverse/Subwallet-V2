// Copyright 2019-2022 @subwallet/extension-web-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountsWithCurrentAddress, RequestInputAccountSubscribe, ResponseInputAccountSubscribe } from '@subwallet/extension-base/types';

import { sendMessage } from '../base';

export async function subscribeAccountsWithCurrentAddress (cb: (data: AccountsWithCurrentAddress) => void): Promise<AccountsWithCurrentAddress> {
  return sendMessage('pri(accounts.subscribeWithCurrentProxy)', {}, cb);
}

export async function subscribeAccountsInputAddress (request: RequestInputAccountSubscribe, cb: (data: ResponseInputAccountSubscribe) => void): Promise<ResponseInputAccountSubscribe> {
  return sendMessage('pri(accounts.subscribeAccountsInputAddress)', request, cb);
}
