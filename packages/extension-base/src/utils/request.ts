// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { EXTENSION_REQUEST_URL } from '@subwallet/extension-base/services/request-service/constants';
import { RequestArguments } from 'web3-core';

export function isInternalRequest (url: string): boolean {
  return url === EXTENSION_REQUEST_URL;
}

export function isSameRequestEVM (request: RequestArguments, request_: RequestArguments) {
  return request_.method === request.method && (request.params as unknown[]).every((props, index) => {
    return props === (request_.params as unknown[])[index];
  });
}
