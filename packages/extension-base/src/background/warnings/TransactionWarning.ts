// Copyright 2019-2022 @subwallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { SWWarning } from '@subwallet/extension-base/background/warnings/SWWarning';
import { BasicTxWarningCode, TransactionWarningType } from '@subwallet/extension-base/types';
import { detectTranslate } from '@subwallet/extension-base/utils';
import { t } from 'i18next';

const defaultWarningMap: Record<TransactionWarningType, { message: string, code?: number }> = {
  [BasicTxWarningCode.NOT_ENOUGH_EXISTENTIAL_DEPOSIT]: {
    message: detectTranslate('Insufficient balance to cover existential deposit. Please decrease the transaction amount or increase your current balance'),
    code: undefined
  },
  [BasicTxWarningCode.IS_BOUNCEABLE_ADDRESS]: {
    message: detectTranslate('We are not supporting for bounceable address. The send mode is work as non-bounceable address.'),
    code: undefined
  }
};

export class TransactionWarning extends SWWarning {
  override warningType: TransactionWarningType;

  constructor (warningType: TransactionWarningType, message?: string, code?: number, data?: unknown) {
    const warningMessage = message || t(defaultWarningMap[warningType]?.message || '') || warningType;

    super(warningType, warningMessage, defaultWarningMap[warningType]?.code, data);
    this.warningType = warningType;
  }
}
