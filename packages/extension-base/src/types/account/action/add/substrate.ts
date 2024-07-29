// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

export interface RequestCheckPublicAndSecretKey {
  secretKey: string;
  publicKey: string;
}

export interface ResponseCheckPublicAndSecretKey {
  address: string;
  isValid: boolean;
  isEthereum: boolean;
}
