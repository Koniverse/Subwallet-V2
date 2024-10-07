// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { SeedLengths } from '@subwallet/extension-base/background/types';
import { KeypairType } from '@subwallet/keyring/types';

export type MnemonicType = 'general' | 'ton';

/**
 * @interface RequestMnemonicCreateV2
 * @description Represents a request to create a new mnemonic phrase.
 *
 * @property {SeedLengths} [length] - The desired length of the mnemonic phrase.
 * @property {string} [mnemonic] - An optional predefined mnemonic phrase.
 * If provided, this mnemonic will be used instead of generating a new one.
 * @property {MnemonicType} [type] - The type of mnemonic to create.
 */
export interface RequestMnemonicCreateV2 {
  length?: SeedLengths;
  mnemonic?: string;
  type?: MnemonicType;
}

/**
 * @interface ResponseMnemonicCreateV2
 * @description Represents the response for creating a new mnemonic phrase.
 *
 * @property {string} mnemonic - The generated mnemonic phrase.
 * @property {Array<KeypairType>} pairTypes - The types of key pairs associated with the mnemonic.
 * @property {Record<KeypairType, string>} addressMap - A map of key pair types to their corresponding addresses.
 */
export interface ResponseMnemonicCreateV2 {
  mnemonic: string;
  pairTypes: Array<KeypairType>;
  addressMap: Record<KeypairType, string>;
}

/**
 * @interface RequestMnemonicValidateV2
 * @description Represents a request to validate a mnemonic phrase.
 *
 * @property {string} mnemonic - The mnemonic seed to validate.
 */
export interface RequestMnemonicValidateV2 {
  mnemonic: string;
}

/**
 * @interface ResponseMnemonicValidateV2
 * @description Represents the response for validating a mnemonic phrase.
 *
 * @property {string} mnemonic - The mnemonic phrase that was validated.
 * @property {MnemonicType} mnemonicTypes - The type of the mnemonic phrase.
 * @property {Array<KeypairType>} pairTypes - The types of key pairs associated with the mnemonic.
 * @property {Record<KeypairType, string>} addressMap - A map of key pair types to their corresponding addresses.
 */
export interface ResponseMnemonicValidateV2 {
  mnemonic: string;
  mnemonicTypes: MnemonicType;
  pairTypes: Array<KeypairType>;
  addressMap: Record<KeypairType, string>;
}

/**
 * @interface RequestAccountCreateSuriV2
 * @description Represents a request to create an account from a mnemonic phrase.
 *
 * @property {string} name - The name of the account.
 * @property {string} [password] - An optional password for the account.
 * @property {string} suri - The mnemonic phrase or derivation path.
 * @property {KeypairType} [type] - The type of key pair to create. "undefined" means the unified account will be created
 * If it is undefined, create a unified account with multiple types.
 * @property {boolean} isAllowed - Indicates if the account creation is allowed.
 */
export interface RequestAccountCreateSuriV2 {
  name: string;
  password?: string;
  suri: string;
  type?: KeypairType;
  isAllowed: boolean;
}

/**
 * @typedef {Record<KeypairType, string>} ResponseAccountCreateSuriV2
 * @description Represents the response for creating an account from a mnemonic phrase.
 */
export type ResponseAccountCreateSuriV2 = Record<KeypairType, string>;
