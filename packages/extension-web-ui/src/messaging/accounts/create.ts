// Copyright 2019-2022 @subwallet/extension-web-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountExternalError, RequestAccountCreateExternalV2, RequestAccountCreateHardwareMultiple, RequestAccountCreateHardwareV2, RequestAccountCreateWithSecretKey, ResponseAccountCreateWithSecretKey } from '@subwallet/extension-base/background/KoniTypes';
import { SeedLengths } from '@subwallet/extension-base/background/types';
import { MnemonicType, RequestAccountCreateSuriV2, ResponseAccountCreateSuriV2, ResponseMnemonicCreateV2 } from '@subwallet/extension-base/types';
import { sendMessage } from '@subwallet/extension-web-ui/messaging/base';

// Create seed
export async function createSeedV2 (length?: SeedLengths, mnemonic?: string, type?: MnemonicType): Promise<ResponseMnemonicCreateV2> {
  return sendMessage('pri(seed.createV2)', { length, mnemonic, type });
}

/// Suri: seed or private key for evm
export async function createAccountSuriV2 (request: RequestAccountCreateSuriV2): Promise<ResponseAccountCreateSuriV2> {
  return sendMessage('pri(accounts.create.suriV2)', request);
}

// Private key for substrate

export async function createAccountWithSecret (request: RequestAccountCreateWithSecretKey): Promise<ResponseAccountCreateWithSecretKey> {
  return sendMessage('pri(accounts.create.withSecret)', request);
}

// Qr, read-only
export async function createAccountExternalV2 (request: RequestAccountCreateExternalV2): Promise<AccountExternalError[]> {
  return sendMessage('pri(accounts.create.externalV2)', request);
}

// Hardware

export async function createAccountHardwareV2 (request: RequestAccountCreateHardwareV2): Promise<boolean> {
  return sendMessage('pri(accounts.create.hardwareV2)', request);
}

export async function createAccountHardwareMultiple (request: RequestAccountCreateHardwareMultiple): Promise<boolean> {
  return sendMessage('pri(accounts.create.hardwareMultiple)', request);
}
