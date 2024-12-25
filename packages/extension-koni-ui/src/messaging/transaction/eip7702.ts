// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { RequestAccountDelegateEIP7702, RequestHandleTransactionWith7702 } from '@subwallet/extension-base/types';
import { sendMessage } from '../base';

export async function delegateEIP7702 (request: RequestAccountDelegateEIP7702) {
  return sendMessage('pri(accounts.evm.eip7702.delegate)', request);
}

export async function handleTransactionEIP7702 (request: RequestHandleTransactionWith7702) {
  return sendMessage('pri(accounts.evm.eip7702.handle)', request);
}
