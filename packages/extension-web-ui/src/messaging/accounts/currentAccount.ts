// Copyright 2019-2022 @subwallet/extension-web-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { RequestCurrentAccountAddress } from '@subwallet/extension-base/background/types';
import { CurrentAccountInfo } from '@subwallet/extension-base/types';
import { sendMessage } from '@subwallet/extension-web-ui/messaging/base';

export async function saveCurrentAccountAddress (data: RequestCurrentAccountAddress): Promise<CurrentAccountInfo> {
  return sendMessage('pri(accounts.saveCurrentProxy)', data);
}
