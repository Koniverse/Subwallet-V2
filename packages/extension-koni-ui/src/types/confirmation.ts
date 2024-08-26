// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ConfirmationDefinitions, ConfirmationDefinitionsTon } from '@subwallet/extension-base/background/KoniTypes';

export type EvmSignatureSupportType = keyof Pick<ConfirmationDefinitions, 'evmSignatureRequest' | 'evmSendTransactionRequest' | 'evmWatchTransactionRequest'>;

export type TonSignatureSupportType = keyof Pick<ConfirmationDefinitionsTon, 'tonSignatureRequest' | 'tonWatchTransactionRequest' | 'tonSendTransactionRequest'>;
