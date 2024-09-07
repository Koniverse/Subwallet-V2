// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { UserOpBundle } from '@particle-network/aa';
import { EXTENSION_REQUEST_URL } from '@subwallet/extension-base/services/request-service/constants';
import { QuoteResponse } from 'klaster-sdk';

export function isInternalRequest (url: string): boolean {
  return url === EXTENSION_REQUEST_URL;
}

export const isParticleOP = (transaction: UserOpBundle | QuoteResponse): transaction is UserOpBundle => {
  return (transaction as UserOpBundle).userOp !== undefined;
};
