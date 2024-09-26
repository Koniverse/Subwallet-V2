// Copyright 2019-2022 @subwallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { SWError } from '@subwallet/extension-base/background/errors/SWError';

export enum DeriveErrorType {
  INVALID_DERIVATION_PATH = 'INVALID_DERIVATION_PATH',
  INVALID_DERIVATION_TYPE = 'INVALID_DERIVATION_TYPE',
  ROOT_ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
  INVALID_ACCOUNT_TYPE = 'INVALID_ACCOUNT_TYPE',
  MAX_DERIVATION_DEPTH = 'MAX_DERIVATION_DEPTH',
  MIN_DERIVATION_DEPTH = 'MIN_DERIVATION_DEPTH',
}

const DEFAULT_DATA: Record<DeriveErrorType, { message: string, code: number | undefined }> = {
  [DeriveErrorType.INVALID_DERIVATION_PATH]: { message: 'Invalid derivation path', code: 1001 },
  [DeriveErrorType.INVALID_DERIVATION_TYPE]: { message: 'Derivation path not supported', code: 1002 },
  [DeriveErrorType.ROOT_ACCOUNT_NOT_FOUND]: { message: 'Account not found', code: 1003 },
  [DeriveErrorType.INVALID_ACCOUNT_TYPE]: { message: 'Invalid account type', code: 1004 },
  [DeriveErrorType.MAX_DERIVATION_DEPTH]: { message: 'Derivation path not supported', code: 1005 },
  [DeriveErrorType.MIN_DERIVATION_DEPTH]: { message: 'Derivation path not supported', code: 1006 }
};

export class SWDeriveError extends SWError {
  override errorClass = 'Derive';
  constructor (errorType: DeriveErrorType, _message?: string) {
    const defaultData = DEFAULT_DATA[errorType];
    const message = _message || defaultData.message;

    super(errorType, message, defaultData.code);
  }
}
