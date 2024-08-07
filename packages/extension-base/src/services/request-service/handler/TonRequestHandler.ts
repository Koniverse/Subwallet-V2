// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import RequestService from '@subwallet/extension-base/services/request-service';

import { logger as createLogger } from '@polkadot/util/logger';
import { Logger } from '@polkadot/util/types';

export default class TonRequestHandler {
  readonly #requestService: RequestService;
  readonly #logger: Logger;

  constructor (requestService: RequestService) {
    this.#requestService = requestService;
    this.#logger = createLogger('TonRequestHandler');
  }
}
