// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

/**
 * @description Represents the request payload for validating an account name.
 *
 * @property {string} name - The name to be validated.
 * @property {string} [proxyId] - Optional, the proxy ID of the account.
 * */
export interface RequestAccountNameValidate {
  name: string;
  proxyId?: string;
}

export interface RequestBounceableValidate {
  address: string;
  chain: string;
}

export interface ResponseAccountNameValidate {
  isValid: boolean;
}
