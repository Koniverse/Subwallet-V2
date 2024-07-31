// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { KeyringState } from '@subwallet/extension-base/background/KoniTypes';
import { ALL_ACCOUNT_KEY } from '@subwallet/extension-base/constants';
import KoniState from '@subwallet/extension-base/koni/background/handlers/State';
import { keyring } from '@subwallet/ui-keyring';
import { BehaviorSubject } from 'rxjs';

import { AccountContext } from './account-context';

export class KeyringService {
  readonly stateSubject = new BehaviorSubject<KeyringState>({
    isReady: false,
    hasMasterPassword: false,
    isLocked: false
  });

  readonly context: AccountContext;

  constructor (public state: KoniState) {
    this.context = new AccountContext(this);
  }

  get keyringState () {
    return this.stateSubject.value;
  }

  updateKeyringState (isReady = true) {
    if (!this.keyringState.isReady && isReady) {
      this.state.eventService.waitCryptoReady
        .then(() => {
          this.state.eventService.emit('keyring.ready', true);
          this.state.eventService.emit('account.ready', true);
        })
        .catch(console.error);
    }

    this.stateSubject.next({
      hasMasterPassword: !!keyring.keyring?.hasMasterPassword,
      isLocked: !!keyring.keyring?.isLocked,
      isReady: isReady
    });
  }

  public lock () {
    keyring.lockAll();
    this.updateKeyringState();
  }

  /* Reset */
  async resetWallet (resetAll: boolean) {
    keyring.resetWallet(resetAll);
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 1500);
    });
    this.updateKeyringState();
    this.context.currentAccountSubject.next({ proxyId: ALL_ACCOUNT_KEY });
  }
  /* Reset */
}
