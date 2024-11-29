// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ConfirmationDefinitionsCardano, ConfirmationsQueueCardano, ConfirmationsQueueItemOptions, ConfirmationTypeCardano, RequestConfirmationCompleteCardano } from '@subwallet/extension-base/background/KoniTypes';
import { ConfirmationRequestBase, Resolver } from '@subwallet/extension-base/background/types';
import RequestService from '@subwallet/extension-base/services/request-service';
import { isInternalRequest } from '@subwallet/extension-base/utils/request';
import { keyring } from '@subwallet/ui-keyring';
import { t } from 'i18next';
import { BehaviorSubject } from 'rxjs';

import { logger as createLogger } from '@polkadot/util/logger';
import { Logger } from '@polkadot/util/types';

export default class CardanoRequestHandler {
  readonly #requestService: RequestService;
  readonly #logger: Logger;

  private readonly confirmationsQueueSubjectCardano = new BehaviorSubject<ConfirmationsQueueCardano>({
    cardanoSignatureRequest: {},
    cardanoSendTransactionRequest: {},
    cardanoWatchTransactionRequest: {}
  });

  private readonly confirmationsPromiseMap: Record<string, { resolver: Resolver<any>, validator?: (rs: any) => Error | undefined }> = {};

  constructor (requestService: RequestService) {
    this.#requestService = requestService;
    this.#logger = createLogger('CardanoRequestHandler');
  }

  public get numCardanoRequests (): number {
    let count = 0;

    Object.values(this.confirmationsQueueSubjectCardano.getValue()).forEach((x) => {
      count += Object.keys(x).length;
    });

    return count;
  }

  public getConfirmationsQueueSubjectCardano (): BehaviorSubject<ConfirmationsQueueCardano> {
    return this.confirmationsQueueSubjectCardano;
  }

  public async addConfirmationCardano<CT extends ConfirmationTypeCardano> (
    id: string,
    url: string,
    type: CT,
    payload: ConfirmationDefinitionsCardano[CT][0]['payload'],
    options: ConfirmationsQueueItemOptions = {},
    validator?: (input: ConfirmationDefinitionsCardano[CT][1]) => Error | undefined
  ): Promise<ConfirmationDefinitionsCardano[CT][1]> {
    const confirmations = this.confirmationsQueueSubjectCardano.getValue();
    const confirmationType = confirmations[type] as Record<string, ConfirmationDefinitionsCardano[CT][0]>;
    const payloadJson = JSON.stringify({});
    const isInternal = isInternalRequest(url);

    if (['cardanoSendTransactionRequest', 'cardanoSignatureRequest'].includes(type)) {
      const isAlwaysRequired = await this.#requestService.settingService.isAlwaysRequired;

      if (isAlwaysRequired) {
        this.#requestService.keyringService.lock();
      }
    }

    // Check duplicate request
    const duplicated = Object.values(confirmationType).find((c) => (c.url === url) && (c.payloadJson === payloadJson));

    if (duplicated) {
      throw new Error('Cardano duplicate request'); // update this message.
    }

    confirmationType[id] = {
      id,
      url,
      isInternal,
      payload,
      payloadJson,
      ...options
    } as ConfirmationDefinitionsCardano[CT][0];

    const promise = new Promise<ConfirmationDefinitionsCardano[CT][1]>((resolve, reject) => {
      this.confirmationsPromiseMap[id] = {
        validator: validator,
        resolver: {
          resolve: resolve,
          reject: reject
        }
      };
    });

    this.confirmationsQueueSubjectCardano.next(confirmations);

    if (!isInternal) {
      this.#requestService.popupOpen();
    }

    this.#requestService.updateIconV2();

    return promise;
  }

  public async completeConfirmationCardano (request: RequestConfirmationCompleteCardano): Promise<boolean> {
    const confirmations = this.confirmationsQueueSubjectCardano.getValue();

    for (const ct in request) {
      const type = ct as ConfirmationTypeCardano;
      const result = request[type] as ConfirmationDefinitionsCardano[typeof type][1];

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
      this.confirmationsQueueSubjectCardano.next(confirmations);

      // Update icon, and close queue
      this.#requestService.updateIconV2(this.#requestService.numAllRequests === 0);
      resolver.resolve(result);
    }

    // TODO: Review later
    return true;
  }

  private async decorateResult<T extends ConfirmationTypeCardano> (t: T, request: ConfirmationDefinitionsCardano[T][0], result: ConfirmationDefinitionsCardano[T][1]) {
    if (result.payload === '') {
      if (t === 'cardanoSignatureRequest') {
        // result.payload = await this.signMessage(request as ConfirmationDefinitions['evmSignatureRequest'][0]);
      } else if (t === 'cardanoSendTransactionRequest') {
        result.payload = this.signTransactionCardano(request as ConfirmationDefinitionsCardano['cardanoSendTransactionRequest'][0]);
      }

      if (t === 'cardanoSignatureRequest' || t === 'cardanoSendTransactionRequest') {
        const isAlwaysRequired = await this.#requestService.settingService.isAlwaysRequired;

        if (isAlwaysRequired) {
          this.#requestService.keyringService.lock();
        }
      }
    }
  }

  private signTransactionCardano (confirmation: ConfirmationDefinitionsCardano['cardanoSendTransactionRequest'][0]): string { // alibaba
    const transaction = confirmation.payload;
    const { cardanoPayload, from } = transaction;

    const pair = keyring.getPair(from);

    if (pair.isLocked) {
      keyring.unlockPair(pair.address);
    }

    return pair.cardano.sign(cardanoPayload);
  }

  public resetWallet () {
    const confirmations = this.confirmationsQueueSubjectCardano.getValue();

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
        delete confirmations[type as ConfirmationTypeCardano][id];
      }
    }

    this.confirmationsQueueSubjectCardano.next(confirmations);
  }
}
