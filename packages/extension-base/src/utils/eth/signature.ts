// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { BigNumber } from '@ethersproject/bignumber';
import { SignatureLike } from '@ethersproject/bytes';
import { Web3Transaction } from '@subwallet/extension-base/types';
import { ethers, Transaction } from 'ethers';

import { BN_ZERO } from '../number';
import { anyNumberToBN } from './common';

export const mergeTransactionAndSignature = (tx: Web3Transaction, _rawSignature: `0x${string}`): `0x${string}` => {
  const _signature = _rawSignature.slice(2);

  const signature: SignatureLike = {
    r: `0x${_signature.substring(0, 64)}`,
    s: `0x${_signature.substring(64, 128)}`,
    v: parseInt(`0x${_signature.substring(128)}`)
  };

  let transaction: Transaction;

  const max = anyNumberToBN(tx.maxFeePerGas);

  if (max.gt(BN_ZERO)) {
    transaction = {
      nonce: tx.nonce,
      maxFeePerGas: BigNumber.from(tx.maxFeePerGas),
      maxPriorityFeePerGas: BigNumber.from(tx.maxPriorityFeePerGas),
      gasLimit: BigNumber.from(tx.gasLimit),
      to: tx.to,
      value: BigNumber.from(tx.value),
      data: tx.data || '',
      chainId: tx.chainId,
      type: 2
    };
  } else {
    transaction = {
      nonce: tx.nonce,
      gasPrice: BigNumber.from(tx.gasPrice),
      gasLimit: BigNumber.from(tx.gasLimit),
      to: tx.to,
      value: BigNumber.from(tx.value),
      data: tx.data || '',
      chainId: tx.chainId,
      type: 0
    };
  }

  return ethers.utils.serializeTransaction(transaction, signature) as `0x${string}`;
};
