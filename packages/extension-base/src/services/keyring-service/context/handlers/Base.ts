// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { KeyringService } from '@subwallet/extension-base/services/keyring-service';

import { AccountState } from '../state';

/**
 * @class AccountBaseHandler
 * @description Base class for account actions
 * */
export class AccountBaseHandler {
  protected readonly state: AccountState;
  protected readonly parentService: KeyringService;

  constructor (parentService: KeyringService, state: AccountState) {
    this.state = state;
    this.parentService = parentService;
  }
}
