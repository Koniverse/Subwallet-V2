// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { KeypairType } from '@subwallet/keyring/types';

import { AccountChainType } from '../../info/keyring';

/**
 * @interface RequestPrivateKeyValidateV2
 * @description Represents the request payload for validating a private key.
 *
 * Use for ethereum and ton private key only.
 *
 * @property {string} privateKey - The private key to be validated.
 * @property {AccountChainType} [chainType] - Optional chain type associated with the private key.
 * If not provided, the chain type will be determined based on the private key length (work only with 2 keypair types).
 */
export interface RequestPrivateKeyValidateV2 {
  privateKey: string;
  chainType?: AccountChainType;
}

/**
 * @interface ResponsePrivateKeyValidateV2
 * @description Represents the response for validating a private key.
 *
 * @property {Record<KeypairType, string>} addressMap - A map of key pair types to their corresponding addresses.
 * @property {boolean} autoAddPrefix - Indicates if the prefix should be automatically added.
 */
export interface ResponsePrivateKeyValidateV2 {
  addressMap: Record<KeypairType, string>;
  autoAddPrefix: boolean;
  keyTypes: KeypairType[];
}

/**
 * @interface RequestCheckPublicAndSecretKey
 * @description Represents the request payload for checking the validity of a public and secret key pair.
 *
 * Use for check ethereum and substrate key pair only.
 *
 * @property {string} secretKey - The secret key to be validated.
 * @property {string} publicKey - The public key to be validated.
 */
export interface RequestCheckPublicAndSecretKey {
  secretKey: string;
  publicKey: string;
}

/**
 * @interface ResponseCheckPublicAndSecretKey
 * @description Represents the response for checking the validity of a public and secret key pair.
 *
 * @property {string} address - The address derived from the public and secret key pair.
 * @property {boolean} isValid - Indicates whether the public and secret key pair is valid.
 * @property {boolean} isEthereum - Indicates whether the key pair is for an Ethereum account.
 */
export interface ResponseCheckPublicAndSecretKey {
  address: string;
  isValid: boolean;
  errorMessage?: string;
  isEthereum: boolean;
}
