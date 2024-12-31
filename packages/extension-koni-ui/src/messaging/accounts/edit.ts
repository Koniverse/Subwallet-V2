// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { RequestChangeTonWalletContractVersion, RequestGetAllTonWalletContractVersion, ResponseGetAllTonWalletContractVersion } from '@subwallet/extension-base/types';

import { sendMessage } from '../base';

export async function editAccount (proxyId: string, name: string): Promise<boolean> {
  return sendMessage('pri(accounts.edit)', { proxyId, name });
}

export async function forgetAccount (proxyId: string, lockAfter = false): Promise<boolean> {
  return sendMessage('pri(accounts.forget)', { proxyId, lockAfter });
}

export async function tonAccountChangeWalletContractVersion (request: RequestChangeTonWalletContractVersion): Promise<string> {
  return sendMessage('pri(accounts.ton.version.change)', request);
}

export async function tonGetAllWalletContractVersion (request: RequestGetAllTonWalletContractVersion): Promise<ResponseGetAllTonWalletContractVersion> {
  return sendMessage('pri(accounts.ton.version.map)', request);
}
