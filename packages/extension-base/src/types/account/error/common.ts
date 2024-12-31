// Copyright 2019-2022 @subwallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { SWError } from '@subwallet/extension-base/background/errors/SWError';
import { detectTranslate } from '@subwallet/extension-base/utils';

export enum CommonAccountErrorType {
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
  ACCOUNT_EXISTED = 'ACCOUNT_EXISTED',
  ACCOUNT_NAME_EXISTED = 'ACCOUNT_NAME_EXISTED',
}

const DEFAULT_DATA: Record<CommonAccountErrorType, { message: string, code: number | undefined }> = {
  [CommonAccountErrorType.ACCOUNT_NOT_FOUND]: { message: detectTranslate('Account not found'), code: 1001 },
  [CommonAccountErrorType.ACCOUNT_EXISTED]: { message: detectTranslate('Account already exists under the name "{{name}}"'), code: 1002 },
  [CommonAccountErrorType.ACCOUNT_NAME_EXISTED]: { message: detectTranslate('Account name already in use'), code: 1003 }
};

export class SWCommonAccountError extends SWError {
  override errorClass = 'Account';
  constructor (errorType: CommonAccountErrorType, _message?: string) {
    const defaultData = DEFAULT_DATA[errorType];
    const message = _message || defaultData.message;

    super(errorType, message, defaultData.code);
  }
}
