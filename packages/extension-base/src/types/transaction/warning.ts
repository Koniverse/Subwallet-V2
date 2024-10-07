// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

export enum BasicTxWarningCode {
  NOT_ENOUGH_EXISTENTIAL_DEPOSIT = 'notEnoughExistentialDeposit',
  IS_BOUNCEABLE_ADDRESS = 'isBounceableAddress'
}

export type TransactionWarningType = BasicTxWarningCode;
