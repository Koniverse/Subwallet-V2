// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { KeyringState } from '@subwallet/extension-base/background/KoniTypes';
import KoniState from '@subwallet/extension-base/koni/background/handlers/State';
import { keyring } from '@subwallet/ui-keyring';
import { BehaviorSubject } from 'rxjs';

import { AccountContext } from './context/account-context';

export class KeyringService {
  private readonly stateSubject = new BehaviorSubject<KeyringState>({
    isReady: false,
    hasMasterPassword: false,
    isLocked: false
  });

  public readonly context: AccountContext;

  constructor (private state: KoniState) {
    this.context = new AccountContext(this.state, this);
  }

  get keyringState () {
    return this.stateSubject.value;
  }

  public keyringStateSubscribe (callback: (state: KeyringState) => void) {
    return this.stateSubject.subscribe(callback);
  }

  public eventInjectReady () {
    this.state.eventService.emit('inject.ready', true);
  }

  public eventRemoveAccountProxy (proxyId: string) {
    this.state.eventService.emit('accountProxy.remove', proxyId);
  }

  public updateKeyringState (isReady = true) {
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
  public async resetWallet (resetAll: boolean) {
    keyring.resetWallet(resetAll);
    this.context.resetWallet();
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 1500);
    });
    this.updateKeyringState();
  }
  /* Reset */
}
