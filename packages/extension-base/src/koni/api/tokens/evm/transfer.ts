// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { ExternalRequestPromise, ExternalRequestPromiseStatus, HandleBasicTx, TransactionResponse } from '@subwallet/extension-base/background/KoniTypes';
import { getERC20Contract } from '@subwallet/extension-base/koni/api/tokens/evm/web3';
import { _BALANCE_PARSING_CHAIN_GROUP, EVM_REFORMAT_DECIMALS } from '@subwallet/extension-base/services/chain-service/constants';
import { _ERC721_ABI } from '@subwallet/extension-base/services/chain-service/helper';
import { _EvmApi } from '@subwallet/extension-base/services/chain-service/types';
import { EvmEIP1995FeeOption, EvmFeeInfo, GetFeeFunction, TransactionFee } from '@subwallet/extension-base/types';
import { combineEthFee } from '@subwallet/extension-base/utils';
import { getId } from '@subwallet/extension-base/utils/getId';
import BigN from 'bignumber.js';
import { TransactionConfig, TransactionReceipt } from 'web3-core';

import { hexToBn } from '@polkadot/util';

interface HandleTransferBalanceResultProps {
  callback: HandleBasicTx;
  changeValue: string;
  networkKey: string;
  receipt: TransactionReceipt;
  response: TransactionResponse;
  updateState?: (promise: Partial<ExternalRequestPromise>) => void;
}

export const handleTransferBalanceResult = ({ callback,
  changeValue,
  networkKey,
  receipt,
  response,
  updateState }: HandleTransferBalanceResultProps) => {
  response.status = true;
  let fee: string;

  if (_BALANCE_PARSING_CHAIN_GROUP.bobabeam.indexOf(networkKey) > -1) {
    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    fee = hexToBn(receipt.l1Fee || '0x0').add(hexToBn(receipt.l2BobaFee || '0x0')).toString();
  } else {
    fee = (receipt.gasUsed * receipt.effectiveGasPrice).toString();
  }

  response.txResult = {
    change: changeValue || '0',
    fee
  };
  updateState && updateState({ status: receipt.status ? ExternalRequestPromiseStatus.COMPLETED : ExternalRequestPromiseStatus.FAILED });
  callback(response);
};

interface TransferEvmProps extends TransactionFee {
  chain: string;
  from: string;
  getChainFee: GetFeeFunction;
  to: string;
  transferAll: boolean;
  value: string;
  evmApi: _EvmApi;
}

export async function getEVMTransactionObject ({ chain,
  evmApi,
  feeCustom: _feeCustom,
  feeOption,
  from,
  getChainFee,
  to,
  transferAll,
  value }: TransferEvmProps): Promise<[TransactionConfig, string]> {
  const id = getId();
  const feeCustom = _feeCustom as EvmEIP1995FeeOption;
  const feeInfo = await getChainFee(id, chain, 'evm') as EvmFeeInfo;

  const feeCombine = combineEthFee(feeInfo, feeOption, feeCustom);

  const transactionObject = {
    to: to,
    value: value,
    from: from,
    ...feeCombine
  } as TransactionConfig;

  const gasLimit = await evmApi.api.eth.estimateGas(transactionObject);

  transactionObject.gas = gasLimit;

  let estimateFee: BigN;

  if (feeCombine.maxFeePerGas) {
    const maxFee = new BigN(feeCombine.maxFeePerGas);

    estimateFee = maxFee.multipliedBy(gasLimit);
  } else {
    estimateFee = new BigN(feeCombine.gasPrice || '0').multipliedBy(gasLimit);
  }

  transactionObject.value = transferAll ? new BigN(value).minus(estimateFee).toString() : value;

  if (EVM_REFORMAT_DECIMALS.acala.includes(chain)) {
    const numberReplace = 18 - 12;

    transactionObject.value = transactionObject.value.substring(0, transactionObject.value.length - 6) + new Array(numberReplace).fill('0').join('');
  }

  return [transactionObject, transactionObject.value.toString()];
}

interface TransferERC20Props extends TransactionFee {
  assetAddress: string;
  chain: string;
  evmApi: _EvmApi;
  from: string;
  getChainFee: GetFeeFunction;
  to: string;
  transferAll: boolean;
  value: string;
}

export async function getERC20TransactionObject ({ assetAddress,
  chain,
  evmApi,
  feeCustom: _feeCustom,
  feeOption,
  from,
  getChainFee,
  to,
  transferAll,
  value }: TransferERC20Props): Promise<[TransactionConfig, string]> {
  const erc20Contract = getERC20Contract(assetAddress, evmApi);
  const feeCustom = _feeCustom as EvmEIP1995FeeOption;

  let freeAmount = new BigN(0);
  let transferValue = value;

  if (transferAll) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
    const bal = await erc20Contract.methods.balanceOf(from).call() as string;

    freeAmount = new BigN(bal || '0');
    transferValue = freeAmount.toFixed(0) || '0';
  }

  function generateTransferData (to: string, transferValue: string): string {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
    return erc20Contract.methods.transfer(to, transferValue).encodeABI() as string;
  }

  const id = getId();

  const transferData = generateTransferData(to, transferValue);
  const [gasLimit, _feeInfo] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
    erc20Contract.methods.transfer(to, transferValue).estimateGas({ from }) as number,
    getChainFee(id, chain, 'evm')
  ]);

  const feeInfo = _feeInfo as EvmFeeInfo;
  const feeCombine = combineEthFee(feeInfo, feeOption, feeCustom);

  const transactionObject = {
    gas: gasLimit,
    from,
    value: '0',
    to: assetAddress,
    data: transferData,
    ...feeCombine
  } as TransactionConfig;

  if (transferAll) {
    transferValue = freeAmount.toFixed(0);
    transactionObject.data = generateTransferData(to, transferValue);
  }

  return [transactionObject, transferValue];
}

interface TransferERC721Props extends TransactionFee {
  chain: string;
  contractAddress: string;
  getChainFee: GetFeeFunction;
  recipientAddress: string;
  senderAddress: string;
  tokenId: string;
  evmApi: _EvmApi;
}

export async function getERC721Transaction ({ chain,
  contractAddress,
  evmApi,
  feeCustom: _feeCustom,
  feeOption,
  getChainFee,
  recipientAddress,
  senderAddress,
  tokenId }: TransferERC721Props): Promise<TransactionConfig> {
  const feeCustom = _feeCustom as EvmEIP1995FeeOption;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const contract = new evmApi.api.eth.Contract(_ERC721_ABI, contractAddress);
  const id = getId();

  const [gasLimit, _feeInfo] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
    contract.methods.safeTransferFrom(senderAddress, recipientAddress, tokenId).estimateGas({ from: senderAddress }) as number,
    getChainFee(id, chain, 'evm')
  ]);

  const feeInfo = _feeInfo as EvmFeeInfo;
  const feeCombine = combineEthFee(feeInfo, feeOption, feeCustom);

  return {
    from: senderAddress,
    gas: gasLimit,
    to: contractAddress,
    value: '0x00',
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
    data: contract.methods.safeTransferFrom(senderAddress, recipientAddress, tokenId).encodeABI(),
    ...feeCombine
  };
}
