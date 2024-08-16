// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { _ChainAsset } from '@subwallet/chain-list/types';
import { INIT_FEE_JETTON_TRANSFER, TON_OPCODES, WORKCHAIN } from '@subwallet/extension-base/services/balance-service/helpers/subscribe/ton/consts';
import { cellToBase64Str, estimateTonTxFee, messageRelaxedToCell } from '@subwallet/extension-base/services/balance-service/helpers/subscribe/ton/utils';
import { _TonApi } from '@subwallet/extension-base/services/chain-service/types';
import { _getContractAddressOfToken, _isJettonToken, _isNativeToken } from '@subwallet/extension-base/services/chain-service/utils';
import { keyring } from '@subwallet/ui-keyring';
import { beginCell, fromNano, internal, toNano } from '@ton/core';
import { Address, JettonMaster, JettonWallet, WalletContractV4 } from '@ton/ton';

interface TonTransactionConfigProps {
  tokenInfo: _ChainAsset;
  from: string,
  to: string,
  networkKey: string,
  value: string,
  transferAll: boolean,
  tonApi: _TonApi
}

export interface TonTransactionConfig {
  from: string,
  to: string,
  networkKey: string,
  value: string,
  payload: string,
  estimateFee: string;
  seqno: number
}

export async function createTonTransaction ({ from, networkKey, to, tokenInfo, tonApi, transferAll, value }: TonTransactionConfigProps): Promise<[TonTransactionConfig | null, string]> {
  if (_isNativeToken(tokenInfo)) {
    return createTonNativeTransaction({ from, to, networkKey, tokenInfo, value: value || '0', transferAll: transferAll, tonApi });
  }

  if (_isJettonToken(tokenInfo)) {
    return createJettonTransaction({ from, to, networkKey, tokenInfo, value: value || '0', transferAll: transferAll, tonApi });
  }

  return [null, value];
}

async function createTonNativeTransaction ({ from, networkKey, to, tonApi, transferAll, value }: TonTransactionConfigProps): Promise<[TonTransactionConfig | null, string]> {
  const keyPair = keyring.getPair(from);
  const tonAddress = Address.parse(from);
  const walletContract = WalletContractV4.create({ workchain: WORKCHAIN, publicKey: Buffer.from(keyPair.publicKey) });
  const contract = tonApi.open(walletContract);
  const seqno = await contract.getSeqno();

  let transferValue: string | undefined;

  const messages =
    internal({
      to: to,
      value: fromNano(value),
      bounce: false // todo: check and update the send bounced logic
    });

  const payload = cellToBase64Str(messageRelaxedToCell(messages));

  const estimateFee = await estimateTonTxFee(tonApi, [messages], walletContract);

  if (transferAll) {
    const balance = await tonApi.getBalance(tonAddress);

    transferValue = (balance - estimateFee).toString();
  }

  const transactionObject = {
    from,
    to,
    networkKey,
    value: transferValue ?? value,
    payload,
    estimateFee: estimateFee.toString(),
    seqno
  } as unknown as TonTransactionConfig;

  return [transactionObject, transactionObject.value];
}

async function createJettonTransaction ({ from, networkKey, to, tokenInfo, tonApi, transferAll, value }: TonTransactionConfigProps): Promise<[TonTransactionConfig | null, string]> {
  const keyPair = keyring.getPair(from);
  const sendertonAddress = Address.parse(from);
  const destinationAddress = Address.parse(to);
  const walletContract = WalletContractV4.create({ workchain: WORKCHAIN, publicKey: Buffer.from(keyPair.publicKey) });
  const contract = tonApi.open(walletContract);
  const seqno = await contract.getSeqno();

  let transferValue: string | undefined;

  // retrieve jetton info
  const jettonContractAddress = Address.parse(_getContractAddressOfToken(tokenInfo));
  const jettonMasterContract = tonApi.open(JettonMaster.create(jettonContractAddress));
  const jettonWalletAddress = await jettonMasterContract.getWalletAddress(sendertonAddress);
  const jettonWalletContract = tonApi.open(JettonWallet.create(jettonWalletAddress));

  const messageBody = beginCell()
    .storeUint(TON_OPCODES.JETTON_TRANSFER, 32) // opcode for jetton transfer
    .storeUint(0, 64) // query id todo: research more about this
    .storeCoins(BigInt(value)) // jetton bigint amount
    .storeAddress(destinationAddress)
    .storeAddress(sendertonAddress) // response destination, who get remain token
    .storeBit(0) // no custom payload
    .storeCoins(BigInt(1)) // forward amount - if >0, will send notification message
    .storeBit(0) // no forward payload
    // .storeRef(forwardPayload)
    .endCell();

  const messages = internal({
    to: jettonWalletAddress, // JettonWallet of sender
    value: toNano(INIT_FEE_JETTON_TRANSFER), // set this for fee, excess later
    bounce: true, // todo: check and update the send bounced logic
    body: messageBody
  });

  const payload = cellToBase64Str(messageRelaxedToCell(messages));

  const estimateExternalFee = await estimateTonTxFee(tonApi, [messages], walletContract);
  const estimateFee = toNano(INIT_FEE_JETTON_TRANSFER) > estimateExternalFee ? toNano(INIT_FEE_JETTON_TRANSFER) : estimateExternalFee;

  if (transferAll) {
    const balance = await jettonWalletContract.getBalance();

    transferValue = (balance - estimateFee).toString();
  }

  const transactionObject = {
    from,
    to,
    networkKey,
    value: transferValue ?? value,
    payload,
    estimateFee: estimateFee.toString(),
    seqno
  } as unknown as TonTransactionConfig;

  return [transactionObject, transactionObject.value];
}
