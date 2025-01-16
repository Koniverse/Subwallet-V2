// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { getERC20Contract } from '@subwallet/extension-base/koni/api/contract-handler/evm/web3';
import { _ERC721_ABI } from '@subwallet/extension-base/koni/api/contract-handler/utils';
import { getPSP34ContractPromise } from '@subwallet/extension-base/koni/api/contract-handler/wasm';
import { getWasmContractGasLimit } from '@subwallet/extension-base/koni/api/contract-handler/wasm/utils';
import { EVM_REFORMAT_DECIMALS } from '@subwallet/extension-base/services/chain-service/constants';
import { _EvmApi, _SubstrateApi } from '@subwallet/extension-base/services/chain-service/types';
import { EvmEIP1559FeeOption, EvmFeeInfo, GetFeeFunction, TransactionFee } from '@subwallet/extension-base/types';
import { combineEthFee } from '@subwallet/extension-base/utils';
import { getId } from '@subwallet/extension-base/utils/getId';
import BigN from 'bignumber.js';
import { t } from 'i18next';
import { TransactionConfig } from 'web3-core';

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
  const feeCustom = _feeCustom as EvmEIP1559FeeOption;
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

export async function getERC20TransactionObject (
  { assetAddress,
    chain,
    evmApi,
    feeCustom: _feeCustom,
    feeOption,
    from,
    getChainFee,
    to,
    transferAll,
    value }: TransferERC20Props
): Promise<[TransactionConfig, string]> {
  const erc20Contract = getERC20Contract(assetAddress, evmApi);
  const feeCustom = _feeCustom as EvmEIP1559FeeOption;

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

export async function getERC721Transaction (
  web3Api: _EvmApi,
  chain: string,
  contractAddress: string,
  senderAddress: string,
  recipientAddress: string,
  tokenId: string,
  getChainFee: GetFeeFunction): Promise<TransactionConfig> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const contract = new web3Api.api.eth.Contract(_ERC721_ABI, contractAddress);

  let gasLimit: number;

  try {
    [gasLimit] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
      contract.methods.safeTransferFrom(senderAddress, recipientAddress, tokenId).estimateGas({ from: senderAddress }) as number
    ]);
  } catch (e) {
    const error = e as Error;

    if (error.message.includes('transfer to non ERC721Receiver implementer')) {
      error.message = t('Unable to send. NFT not supported on recipient address');
    }

    throw error;
  }

  const id = getId();
  const feeInfo = await getChainFee(id, chain, 'evm') as EvmFeeInfo;
  const feeCombine = combineEthFee(feeInfo);

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

const mustFormatNumberReg = /^-?[0-9][0-9,.]+$/;

export async function getPSP34TransferExtrinsic (substrateApi: _SubstrateApi, senderAddress: string, recipientAddress: string, params: Record<string, any>) {
  const contractAddress = params.contractAddress as string;
  const onChainOption = params.onChainOption as Record<string, string>;

  for (const [key, value] of Object.entries(onChainOption)) {
    if (mustFormatNumberReg.test(value)) {
      onChainOption[key] = value.replaceAll(',', '');
    }
  }

  try {
    const contractPromise = getPSP34ContractPromise(substrateApi.api, contractAddress);
    // @ts-ignore
    const gasLimit = await getWasmContractGasLimit(substrateApi.api, senderAddress, 'psp34::transfer', contractPromise, {}, [recipientAddress, onChainOption, {}]);

    // @ts-ignore
    return contractPromise.tx['psp34::transfer']({ gasLimit }, recipientAddress, onChainOption, {});
  } catch (e) {
    console.debug(e);

    return null;
  }
}
