// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import { LEDGER_GENERIC_ALLOW_NETWORKS } from '@subwallet/extension-base/core/consts';
import { BalanceAccountType } from '@subwallet/extension-base/core/substrate/types';
import { LedgerMustCheckType, ValidateRecipientParams } from '@subwallet/extension-base/core/types';
import { _isChainEvmCompatible, _isChainSubstrateCompatible, _isChainTonCompatible } from '@subwallet/extension-base/services/chain-service/utils';
import { AccountJson } from '@subwallet/extension-base/types';
import { detectTranslate, isAddressAndChainCompatible, isSameAddress, reformatAddress } from '@subwallet/extension-base/utils';
import { isAddress } from '@subwallet/keyring';

import { isEthereumAddress } from '@polkadot/util-crypto';

export function getStrictMode (type: string, extrinsicType?: ExtrinsicType) {
  if (type === BalanceAccountType.FrameSystemAccountInfo) {
    return !extrinsicType || ![ExtrinsicType.TRANSFER_BALANCE].includes(extrinsicType);
  }

  return false;
}

export function _getAppliedExistentialDeposit (existentialDeposit: string, strictMode?: boolean): bigint {
  return strictMode ? BigInt(existentialDeposit) : BigInt(0);
}

export function getMaxBigInt (a: bigint, b: bigint): bigint {
  return a > b ? a : b;
}

export function ledgerMustCheckNetwork (account: AccountJson | null): LedgerMustCheckType {
  if (account && account.isHardware && account.isGeneric && !isEthereumAddress(account.address)) {
    return account.originGenesisHash ? 'migration' : 'polkadot';
  } else {
    return 'unnecessary';
  }
}

// --- recipient address validation --- //

export function _isNotNull (validateRecipientParams: ValidateRecipientParams) {
  const { toAddress } = validateRecipientParams;

  if (!toAddress) {
    return Promise.reject(detectTranslate('Recipient address is required'));
  }

  return Promise.resolve();
}

export function _isAddress (validateRecipientParams: ValidateRecipientParams) {
  const { toAddress } = validateRecipientParams;

  if (!isAddress(toAddress)) {
    return Promise.reject(detectTranslate('Invalid recipient address'));
  }

  return Promise.resolve();
}

export function _isValidAddressForEcosystem (validateRecipientParams: ValidateRecipientParams) {
  const { destChainInfo, toAddress } = validateRecipientParams;

  if (!isAddressAndChainCompatible(toAddress, destChainInfo)) {
    if (_isChainEvmCompatible(destChainInfo)) {
      return Promise.reject(detectTranslate('The recipient address must be EVM type'));
    }

    if (_isChainSubstrateCompatible(destChainInfo)) {
      return Promise.reject(detectTranslate('The recipient address must be Substrate type'));
    }

    if (_isChainTonCompatible(destChainInfo)) {
      return Promise.reject(detectTranslate('The recipient address must be Ton type'));
    }

    return Promise.reject(detectTranslate('Unknown chain type'));
  }

  return Promise.resolve();
}

export function _isValidSubstrateAddressFormat (validateRecipientParams: ValidateRecipientParams) {
  const { destChainInfo, toAddress } = validateRecipientParams;

  const addressPrefix = destChainInfo?.substrateInfo?.addressPrefix ?? 42;
  const toAddressFormatted = reformatAddress(toAddress, addressPrefix);

  if (toAddressFormatted !== toAddress) {
    return Promise.reject(detectTranslate(`Recipient should be a valid ${destChainInfo.name} address`));
  }

  return Promise.resolve();
}

export function _isNotDuplicateAddress (validateRecipientParams: ValidateRecipientParams) {
  const { fromAddress, toAddress } = validateRecipientParams;

  if (isSameAddress(fromAddress, toAddress)) {
    return Promise.reject(detectTranslate('The recipient address can not be the same as the sender address'));
  }

  return Promise.resolve();
}

export function _isSupportLedgerAccount (validateRecipientParams: ValidateRecipientParams) {
  const { account, destChainInfo } = validateRecipientParams;

  const ledgerCheck = ledgerMustCheckNetwork(account);

  if (ledgerCheck !== 'unnecessary' && !LEDGER_GENERIC_ALLOW_NETWORKS.includes(destChainInfo.slug)) {
    return Promise.reject(detectTranslate(`Ledger ${ledgerCheck === 'polkadot' ? 'Polkadot' : 'Migration'} address is not supported for this transfer`));
  }

  return Promise.resolve();
}
