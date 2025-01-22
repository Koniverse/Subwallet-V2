// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import { BalanceAccountType } from '@subwallet/extension-base/core/substrate/types';
import { LedgerMustCheckType, ValidateRecipientParams } from '@subwallet/extension-base/core/types';
import { tonAddressInfo } from '@subwallet/extension-base/services/balance-service/helpers/subscribe/ton/utils';
import { _isChainCardanoCompatible, _isChainEvmCompatible, _isChainSubstrateCompatible, _isChainTonCompatible } from '@subwallet/extension-base/services/chain-service/utils';
import { AccountJson } from '@subwallet/extension-base/types';
import { isAddressAndChainCompatible, isSameAddress, reformatAddress } from '@subwallet/extension-base/utils';
import { isAddress, isCardanoTestnetAddress, isTonAddress } from '@subwallet/keyring';

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

export function _isNotNull (validateRecipientParams: ValidateRecipientParams): string {
  const { toAddress } = validateRecipientParams;

  if (!toAddress) {
    return 'Recipient address is required';
  }

  return '';
}

export function _isAddress (validateRecipientParams: ValidateRecipientParams): string {
  const { toAddress } = validateRecipientParams;

  if (!isAddress(toAddress)) {
    return 'Invalid recipient address';
  }

  return '';
}

export function _isValidAddressForEcosystem (validateRecipientParams: ValidateRecipientParams): string {
  const { destChainInfo, toAddress } = validateRecipientParams;

  if (!isAddressAndChainCompatible(toAddress, destChainInfo)) {
    if (_isChainEvmCompatible(destChainInfo) ||
      _isChainSubstrateCompatible(destChainInfo) ||
      _isChainTonCompatible(destChainInfo) ||
      _isChainCardanoCompatible(destChainInfo)) {
      return 'Recipient address must be the same type as sender address';
    }

    return 'Unknown chain type';
  }

  return '';
}

export function _isValidSubstrateAddressFormat (validateRecipientParams: ValidateRecipientParams): string {
  const { destChainInfo, toAddress } = validateRecipientParams;

  const addressPrefix = destChainInfo?.substrateInfo?.addressPrefix ?? 42;
  const toAddressFormatted = reformatAddress(toAddress, addressPrefix);

  if (toAddressFormatted !== toAddress) {
    return `Recipient address must be a valid ${destChainInfo.name} address`;
  }

  return '';
}

export function _isValidTonAddressFormat (validateRecipientParams: ValidateRecipientParams): string {
  const { destChainInfo, toAddress } = validateRecipientParams;
  const tonInfoData = isTonAddress(toAddress) && tonAddressInfo(toAddress);

  if (tonInfoData && tonInfoData.isTestOnly !== destChainInfo.isTestnet) {
    return `Recipient address must be a valid ${destChainInfo.name} address`;
  }

  return '';
}

export function _isValidCardanoAddressFormat (validateRecipientParams: ValidateRecipientParams): string {
  const { destChainInfo, toAddress } = validateRecipientParams;

  if (isCardanoTestnetAddress(toAddress) !== destChainInfo.isTestnet) {
    return `Recipient address must be a valid ${destChainInfo.name} address`;
  }

  return '';
}

export function _isNotDuplicateAddress (validateRecipientParams: ValidateRecipientParams): string {
  const { fromAddress, toAddress } = validateRecipientParams;

  if (isSameAddress(fromAddress, toAddress)) {
    return 'Recipient address must be different from sender address';
  }

  return '';
}

export function _isSupportLedgerAccount (validateRecipientParams: ValidateRecipientParams): string {
  const { account, allowLedgerGenerics, destChainInfo } = validateRecipientParams;

  if (account?.isHardware) {
    if (!account.isGeneric) {
      // For ledger legacy
      const availableGen: string[] = account.availableGenesisHashes || [];
      const destChainName = destChainInfo?.name || 'Unknown';

      if (!availableGen.includes(destChainInfo?.substrateInfo?.genesisHash || '')) {
        return 'Your Ledger account is not supported by {{network}} network.'.replace('{{network}}', destChainName);
      }
    } else {
      // For ledger generic
      const ledgerCheck = ledgerMustCheckNetwork(account);

      if (ledgerCheck !== 'unnecessary' && !allowLedgerGenerics.includes(destChainInfo.slug)) {
        return `Ledger ${ledgerCheck === 'polkadot' ? 'Polkadot' : 'Migration'} address is not supported for this transfer`;
      }
    }
  }

  return '';
}
