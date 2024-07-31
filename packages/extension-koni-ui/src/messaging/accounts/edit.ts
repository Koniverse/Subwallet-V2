// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { sendMessage } from '../base';

export async function editAccount (proxyId: string, name: string): Promise<boolean> {
  return sendMessage('pri(accounts.edit)', { proxyId, name });
}

export async function forgetAccount (address: string, lockAfter = false): Promise<boolean> {
  return sendMessage('pri(accounts.forget)', { proxyId: address, lockAfter });
}
