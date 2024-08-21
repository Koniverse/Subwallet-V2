// Copyright 2019-2022 @subwallet/extension-web-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ResponseCheckPublicAndSecretKey, ResponseMnemonicValidateV2, ResponsePrivateKeyValidateV2 } from '@subwallet/extension-base/types';
import { sendMessage } from '@subwallet/extension-web-ui/messaging/base';

export async function checkPublicAndPrivateKey (publicKey: string, secretKey: string): Promise<ResponseCheckPublicAndSecretKey> {
  return sendMessage('pri(accounts.validate.substrate.publicAndPrivateKey)', { publicKey, secretKey });
}

export async function validateSeedV2 (mnemonic: string): Promise<ResponseMnemonicValidateV2> {
  return sendMessage('pri(accounts.validate.seed)', { mnemonic });
}

export async function validateMetamaskPrivateKeyV2 (privateKey: string): Promise<ResponsePrivateKeyValidateV2> {
  return sendMessage('pri(accounts.validate.privateKey)', { privateKey });
}
