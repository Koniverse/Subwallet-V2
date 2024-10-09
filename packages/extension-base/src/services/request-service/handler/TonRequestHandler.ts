// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ConfirmationDefinitionsTon, ConfirmationsQueueItemOptions, ConfirmationsQueueTon, ConfirmationTypeTon, RequestConfirmationCompleteTon } from '@subwallet/extension-base/background/KoniTypes';
import { ConfirmationRequestBase, Resolver } from '@subwallet/extension-base/background/types';
import RequestService from '@subwallet/extension-base/services/request-service';
import { isInternalRequest } from '@subwallet/extension-base/utils/request';
import { keyring } from '@subwallet/ui-keyring';
import { Cell } from '@ton/core';
import { t } from 'i18next';
import { BehaviorSubject } from 'rxjs';

import { u8aToHex } from '@polkadot/util';
import { logger as createLogger } from '@polkadot/util/logger';
import { Logger } from '@polkadot/util/types';

export default class TonRequestHandler {
  readonly #requestService: RequestService;
  readonly #logger: Logger;

  private readonly confirmationsQueueSubjectTon = new BehaviorSubject<ConfirmationsQueueTon>({
    tonSignatureRequest: {},
    tonSendTransactionRequest: {},
    tonWatchTransactionRequest: {}
  });

  private readonly confirmationsPromiseMap: Record<string, { resolver: Resolver<any>, validator?: (rs: any) => Error | undefined }> = {};

  constructor (requestService: RequestService) {
    this.#requestService = requestService;
    this.#logger = createLogger('TonRequestHandler');
  }

  public get numTonRequests (): number {
    let count = 0;

    Object.values(this.confirmationsQueueSubjectTon.getValue()).forEach((x) => {
      count += Object.keys(x).length;
    });

    return count;
  }

  public getConfirmationsQueueSubjectTon (): BehaviorSubject<ConfirmationsQueueTon> {
    return this.confirmationsQueueSubjectTon;
  }

  public async addConfirmationTon<CT extends ConfirmationTypeTon> (
    id: string,
    url: string,
    type: CT,
    payload: ConfirmationDefinitionsTon[CT][0]['payload'], // todo: messages <-> payload
    options: ConfirmationsQueueItemOptions = {},
    validator?: (input: ConfirmationDefinitionsTon[CT][1]) => Error | undefined
  ): Promise<ConfirmationDefinitionsTon[CT][1]> {
    const confirmations = this.confirmationsQueueSubjectTon.getValue();
    const confirmationType = confirmations[type] as Record<string, ConfirmationDefinitionsTon[CT][0]>;
    const payloadJson = JSON.stringify({});
    const isInternal = isInternalRequest(url);

    if (['tonSendTransactionRequest', 'tonSignatureRequest'].includes(type)) {
      const isAlwaysRequired = await this.#requestService.settingService.isAlwaysRequired;

      if (isAlwaysRequired) {
        this.#requestService.keyringService.lock();
      }
    }

    // Check duplicate request
    const duplicated = Object.values(confirmationType).find((c) => (c.url === url) && (c.payloadJson === payloadJson));

    if (duplicated) {
      throw new Error('Ton duplicate request'); // update this message.
    }

    confirmationType[id] = {
      id,
      url,
      isInternal,
      payload,
      payloadJson,
      ...options
    } as ConfirmationDefinitionsTon[CT][0];

    const promise = new Promise<ConfirmationDefinitionsTon[CT][1]>((resolve, reject) => {
      this.confirmationsPromiseMap[id] = {
        validator: validator,
        resolver: {
          resolve: resolve,
          reject: reject
        }
      };
    });

    this.confirmationsQueueSubjectTon.next(confirmations);

    if (!isInternal) {
      this.#requestService.popupOpen();
    }

    this.#requestService.updateIconV2();

    return promise;
  }

  public async completeConfirmationTon (request: RequestConfirmationCompleteTon): Promise<boolean> {
    const confirmations = this.confirmationsQueueSubjectTon.getValue();

    for (const ct in request) {
      const type = ct as ConfirmationTypeTon;
      const result = request[type] as ConfirmationDefinitionsTon[typeof type][1];

      const { id } = result;
      const { resolver, validator } = this.confirmationsPromiseMap[id];
      const confirmation = confirmations[type][id];

      if (!resolver || !confirmation) {
        this.#logger.error(t('Unable to proceed. Please try again'), type, id);
        throw new Error(t('Unable to proceed. Please try again'));
      }

      // Fill signature for some special type
      await this.decorateResult(type, confirmation, result);

      // Validate response from confirmation popup some info like password, response format....
      const error = validator && validator(result);

      if (error) {
        resolver.reject(error);
      }

      // Delete confirmations from queue
      delete this.confirmationsPromiseMap[id];
      delete confirmations[type][id];
      this.confirmationsQueueSubjectTon.next(confirmations);

      // Update icon, and close queue
      this.#requestService.updateIconV2(this.#requestService.numAllRequests === 0);
      resolver.resolve(result);
    }

    // TODO: Review later
    return true;
  }

  private async decorateResult<T extends ConfirmationTypeTon> (t: T, request: ConfirmationDefinitionsTon[T][0], result: ConfirmationDefinitionsTon[T][1]) {
    if (result.payload === '') {
      if (t === 'tonSignatureRequest') {
        // result.payload = await this.signMessage(request as ConfirmationDefinitions['evmSignatureRequest'][0]);
      } else if (t === 'tonSendTransactionRequest') {
        result.payload = this.signTransactionTon(request as ConfirmationDefinitionsTon['tonSendTransactionRequest'][0]);
      }

      if (t === 'tonSignatureRequest' || t === 'tonSendTransactionRequest') {
        const isAlwaysRequired = await this.#requestService.settingService.isAlwaysRequired;

        if (isAlwaysRequired) {
          this.#requestService.keyringService.lock();
        }
      }
    }
  }

  private signTransactionTon (confirmation: ConfirmationDefinitionsTon['tonSendTransactionRequest'][0]): string {
    const transaction = confirmation.payload;
    const { from, messagePayload } = transaction;

    const pair = keyring.getPair(from);

    if (pair.isLocked) {
      keyring.unlockPair(pair.address);
    }

    const messages = Cell.fromBase64(messagePayload);
    const signedTransaction = pair.ton.sign(messages);

    return u8aToHex(Uint8Array.from(signedTransaction));
  }

  public resetWallet () {
    const confirmations = this.confirmationsQueueSubjectTon.getValue();

    for (const [type, requests] of Object.entries(confirmations)) {
      for (const confirmation of Object.values(requests)) {
        const { id } = confirmation as ConfirmationRequestBase;
        const { resolver } = this.confirmationsPromiseMap[id];

        if (!resolver || !confirmation) {
          console.error('Not found confirmation', type, id);
        } else {
          resolver.reject(new Error('Reset wallet'));
        }

        delete this.confirmationsPromiseMap[id];
        delete confirmations[type as ConfirmationTypeTon][id];
      }
    }

    this.confirmationsQueueSubjectTon.next(confirmations);
  }
}
