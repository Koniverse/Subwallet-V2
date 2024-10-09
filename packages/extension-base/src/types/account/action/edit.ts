// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { TonWalletContractVersion } from '@subwallet/keyring/types';

export interface RequestAccountProxyEdit {
  proxyId: string;
  name: string;
}

export interface RequestAccountProxyForget {
  proxyId: string;
  lockAfter: boolean;
}

export interface RequestGetAllTonWalletContractVersion {
  address: string;
  isTestnet?: boolean
}

export interface ResponseGetAllTonWalletContractVersion {
  address: string;
  currentVersion: TonWalletContractVersion;
  addressMap: Record<TonWalletContractVersion, string>;
}

/**
 * @interface RequestChangeTonWalletContractVersion
 * @description Represents the request payload for changing the contract version of a TON wallet.
 *
 * @property {string} proxyId - The proxy ID of the account whose wallet contract version is to be changed.
 * @property {string} [address] - Optional, special address of the account proxy.
 * @property {TonWalletContractVersion} version - The new contract version to be set for the TON wallet.
 */
export interface RequestChangeTonWalletContractVersion {
  proxyId: string;
  address?: string;
  version: TonWalletContractVersion;
}
