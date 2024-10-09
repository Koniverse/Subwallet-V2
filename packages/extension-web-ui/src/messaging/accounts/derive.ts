// Copyright 2019-2022 @subwallet/extension-web-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { RequestDeriveCreateMultiple, RequestDeriveCreateV3, RequestDeriveValidateV2, RequestGetDeriveAccounts, ResponseDeriveValidateV2, ResponseGetDeriveAccounts } from '@subwallet/extension-base/types';

import { sendMessage } from '../base';

export async function validateDerivePathV2 (request: RequestDeriveValidateV2): Promise<ResponseDeriveValidateV2> {
  return sendMessage('pri(accounts.derive.validateV2)', request);
}

export async function getListDeriveAccounts (request: RequestGetDeriveAccounts): Promise<ResponseGetDeriveAccounts> {
  return sendMessage('pri(accounts.derive.getList)', request);
}

export async function deriveMultiple (request: RequestDeriveCreateMultiple): Promise<boolean> {
  return sendMessage('pri(accounts.derive.create.multiple)', request);
}

export async function deriveAccountV3 (request: RequestDeriveCreateV3): Promise<boolean> {
  return sendMessage('pri(accounts.derive.createV3)', request);
}
