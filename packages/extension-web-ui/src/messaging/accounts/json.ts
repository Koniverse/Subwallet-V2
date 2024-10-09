// Copyright 2019-2022 @subwallet/extension-web-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { RequestJsonRestoreV2, ResponseJsonGetAccountInfo } from '@subwallet/extension-base/types';
import { KeyringPair$Json } from '@subwallet/keyring/types';
import { KeyringPairs$Json } from '@subwallet/ui-keyring/types';

import { sendMessage } from '../base';

export async function jsonGetAccountInfo (json: KeyringPair$Json): Promise<ResponseJsonGetAccountInfo> {
  return sendMessage('pri(accounts.json.info)', json);
}

export async function jsonRestoreV2 (request: RequestJsonRestoreV2): Promise<string[]> {
  return sendMessage('pri(accounts.json.restoreV2)', request);
}

export async function batchRestoreV2 (file: KeyringPairs$Json, password: string, accountsInfo: ResponseJsonGetAccountInfo[], isAllowed: boolean): Promise<string[]> {
  return sendMessage('pri(accounts.json.batchRestoreV2)', { file, password, accountsInfo, isAllowed });
}
