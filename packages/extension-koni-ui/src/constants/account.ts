// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { KeypairType } from '@subwallet/keyring/types';

export const SUBSTRATE_ACCOUNT_TYPE: KeypairType = 'sr25519';
export const EVM_ACCOUNT_TYPE: KeypairType = 'ethereum';
export const BIT44_ACCOUNT_TYPE: KeypairType = 'bitcoin-44';
export const BIT84_ACCOUNT_TYPE: KeypairType = 'bitcoin-84';
export const BIT86_ACCOUNT_TYPE: KeypairType = 'bitcoin-86';

export const DEFAULT_ACCOUNT_TYPES: KeypairType[] = [SUBSTRATE_ACCOUNT_TYPE, EVM_ACCOUNT_TYPE];
