// Copyright 2019-2022 @subwallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

export interface SWErrorData {
  errorClass: string;
  errorType: string;
  message: string;
  name?: string;
  code?: number;
  data?: unknown;
}
