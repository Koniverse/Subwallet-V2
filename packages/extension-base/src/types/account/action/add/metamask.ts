// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { KeypairType } from '@subwallet/keyring/types';

export interface RequestPrivateKeyValidateV2 {
  privateKey: string;
}

/**
 * @interface ResponsePrivateKeyValidateV2
 * @description Represents the response for validating a private key.
 *
 * @property {Record<KeypairType, string>} addressMap - A map of key pair types to their corresponding addresses.
 * @property {boolean} autoAddPrefix - Indicates if the prefix should be automatically added.
 */
export interface ResponsePrivateKeyValidateV2 {
  addressMap: Record<KeypairType, string>,
  autoAddPrefix: boolean
}
