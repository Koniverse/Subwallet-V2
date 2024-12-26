// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { RequestAccountDelegateEIP7702, RequestAccountUnDelegateEIP7702, RequestHandleTransactionWith7702 } from '@subwallet/extension-base/types';
import { RequestEIP7683 } from '@subwallet/extension-base/types/transaction/ethereum/eip7683';
import { sendMessage } from '../base';

export async function delegateEIP7702 (request: RequestAccountDelegateEIP7702) {
  return sendMessage('pri(accounts.evm.eip7702.delegate)', request);
}

export async function undelegateEIP7702 (request: RequestAccountUnDelegateEIP7702) {
  return sendMessage('pri(accounts.evm.eip7702.undelegate)', request);
}

export async function handleTransactionEIP7702 (request: RequestHandleTransactionWith7702) {
  return sendMessage('pri(accounts.evm.eip7702.handle)', request);
}

export async function handleTransactionEIP7683 (request: RequestEIP7683) {
  return sendMessage('pri(accounts.evm.eip7683.handle)', request);
}
