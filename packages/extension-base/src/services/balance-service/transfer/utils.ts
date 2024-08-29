// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { ChainInfoMap } from '@subwallet/chain-list';
import { _isChainEvmCompatible } from '@subwallet/extension-base/services/chain-service/utils';
import { isSameAddress } from '@subwallet/extension-base/utils';
import { findAccountByAddress, reformatAddress } from '@subwallet/extension-koni-ui/utils';
import { isAddress, isTonAddress } from '@subwallet/keyring';

import { isEthereumAddress } from '@polkadot/util-crypto';

export function validateRecipientAddress (srcChain: string, destChain: string, fromAddress: string, toAddress: string) {
  const errors: string[] = [];

  if (!toAddress) {
    errors.push('Recipient address is required');
  }

  if (!isAddress(toAddress)) {
    errors.push('Invalid recipient address');
  }

  if (!isEthereumAddress(toAddress) && !isTonAddress(toAddress)) {
    const destChainInfo = ChainInfoMap[destChain];
    const addressPrefix = destChainInfo?.substrateInfo?.addressPrefix ?? 42;
    const _addressOnChain = reformatAddress(toAddress, addressPrefix);

    if (_addressOnChain !== toAddress) {
      errors.push(`Recipient should be a valid ${destChainInfo.name} address`);
    }
  }

  const isOnChain = srcChain === destChain;

  if (isOnChain) {
    if (isSameAddress(fromAddress, toAddress) && !isTonAddress(toAddress)) {
      errors.push('The recipient address can not be the same as the sender address');
    }

    const isNotSameAddressType = (isEthereumAddress(fromAddress) && !isEthereumAddress(toAddress)) ||
      (!isEthereumAddress(fromAddress) && isEthereumAddress(toAddress));

    if (isNotSameAddressType) {
      errors.push('The recipient address must be same type as the current account address.');
    }
  } else {
    const isDestChainEvmCompatible = _isChainEvmCompatible(ChainInfoMap[destChain]);
    const isEthereumReceiverAddress = isEthereumAddress(toAddress);

    if (isDestChainEvmCompatible && !isEthereumReceiverAddress) {
      errors.push('The recipient address must be EVM type');
    }

    if (!isDestChainEvmCompatible && isEthereumReceiverAddress) {
      errors.push('The recipient address must be Substrate type');
    }
  }

  const account = findAccountByAddress(accounts, toAddress);

  if (account?.isHardware) {
    const destChainInfo = ChainInfoMap[destChain];
    const availableGen: string[] = account.availableGenesisHashes || [];

    if (!account.isGeneric && !availableGen.includes(destChainInfo?.substrateInfo?.genesisHash || '')) {
      const destChainName = destChainInfo?.name || 'Unknown';

      errors.push(`Wrong network. Your Ledger account is not supported by ${destChainName}. Please choose another receiving account and try again.`);
    }
  }

  return errors;
}
