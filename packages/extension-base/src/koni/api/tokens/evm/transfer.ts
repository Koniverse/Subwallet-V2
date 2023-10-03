// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { _ChainInfo } from '@subwallet/chain-list/types';
import { ExternalRequestPromise, ExternalRequestPromiseStatus, HandleBasicTx, TransactionResponse } from '@subwallet/extension-base/background/KoniTypes';
import { getERC20Contract, getERC721Contract } from '@subwallet/extension-base/koni/api/tokens/evm/web3';
import { _BALANCE_PARSING_CHAIN_GROUP, EVM_REFORMAT_DECIMALS } from '@subwallet/extension-base/services/chain-service/constants';
import { _EvmApi } from '@subwallet/extension-base/services/chain-service/types';
import BigN from 'bignumber.js';
import { Transaction as TransactionConfig, TransactionReceipt } from 'web3-types';

import { BN, hexToBn } from '@polkadot/util';

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
    if (receipt.effectiveGasPrice) {
      fee = new BigN(receipt.gasUsed.toString()).multipliedBy(receipt.effectiveGasPrice.toString()).toString();
    } else {
      fee = '0';
    }
  }

  response.txResult = {
    change: changeValue || '0',
    fee
  };
  updateState && updateState({ status: receipt.status ? ExternalRequestPromiseStatus.COMPLETED : ExternalRequestPromiseStatus.FAILED });
  callback(response);
};

export async function getEVMTransactionObject (
  chainInfo: _ChainInfo,
  from: string,
  to: string,
  value: string,
  transferAll: boolean,
  evmApiMap: Record<string, _EvmApi>
): Promise<[TransactionConfig, string]> {
  const networkKey = chainInfo.slug;
  const web3Api = evmApiMap[networkKey];
  const gasPrice = await web3Api.api.eth.getGasPrice();
  const transactionObject = {
    gasPrice: gasPrice,
    to: to,
    from: from,
    value: value
  } as TransactionConfig;
  const gasLimit = await web3Api.api.eth.estimateGas(transactionObject);

  transactionObject.gas = gasLimit;

  const estimateFee = new BN(gasLimit.toString()).mul(new BN(gasPrice.toString()));

  transactionObject.value = transferAll ? new BN(value).sub(estimateFee).toString() : value;

  if (EVM_REFORMAT_DECIMALS.acala.includes(networkKey)) {
    const numberReplace = 18 - 12;

    transactionObject.value = transactionObject.value.substring(0, transactionObject.value.length - 6) + new Array(numberReplace).fill('0').join('');
  }

  return [transactionObject, transactionObject.value.toString()];
}

export async function getERC20TransactionObject (
  assetAddress: string,
  chainInfo: _ChainInfo,
  from: string,
  to: string,
  value: string,
  transferAll: boolean,
  evmApiMap: Record<string, _EvmApi>
): Promise<[TransactionConfig, string]> {
  const networkKey = chainInfo.slug;
  const evmApi = evmApiMap[networkKey];

  console.debug('erc20Contract', 'start');
  const erc20Contract = getERC20Contract(evmApi, assetAddress);

  console.debug('erc20Contract', 'done');

  let freeAmount = new BN(0);
  let transferValue = value;

  if (transferAll) {
    const bal = await erc20Contract.methods.balanceOf(from).call();

    freeAmount = new BN((bal || '0') as string);
    transferValue = freeAmount.toString() || '0';
  }

  function generateTransferData (to: string, transferValue: string): string {
    return erc20Contract.methods.transfer(to, transferValue).encodeABI();
  }

  const transferData = generateTransferData(to, transferValue);
  const [gasLimit, gasPrice] = await Promise.all([
    erc20Contract.methods.transfer(to, transferValue).estimateGas({ from }),
    evmApi.api.eth.getGasPrice()
  ]);

  const transactionObject = {
    gasPrice: gasPrice,
    gas: gasLimit,
    from,
    to: assetAddress,
    data: transferData
  } as TransactionConfig;

  if (transferAll) {
    transferValue = new BN(freeAmount).toString();
    transactionObject.data = generateTransferData(to, transferValue);
  }

  return [transactionObject, transferValue];
}

export async function getERC721Transaction (
  web3Api: _EvmApi,
  contractAddress: string,
  senderAddress: string,
  recipientAddress: string,
  tokenId: string): Promise<TransactionConfig> {
  const contract = getERC721Contract(web3Api, contractAddress);

  const [gasLimit, gasPrice] = await Promise.all([
    contract.methods.safeTransferFrom(senderAddress, recipientAddress, tokenId).estimateGas({ from: senderAddress }),
    web3Api.api.eth.getGasPrice()
  ]);

  return {
    from: senderAddress,
    gasPrice,
    gas: gasLimit,
    to: contractAddress,
    value: '0x00',
    data: contract.methods.safeTransferFrom(senderAddress, recipientAddress, tokenId).encodeABI()
  };
}
