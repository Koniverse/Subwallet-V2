// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { EXTRA_TON_ESTIMATE_FEE, SendMode, SW_QUERYID_HEX } from '@subwallet/extension-base/services/balance-service/helpers/subscribe/ton/consts';
import { TxByMsgResponse } from '@subwallet/extension-base/services/balance-service/helpers/subscribe/ton/types';
import { TonApi } from '@subwallet/extension-base/services/chain-service/handler/TonApi';
import { _TonApi } from '@subwallet/extension-base/services/chain-service/types';
import { Address, beginCell, Cell, MessageRelaxed, storeMessage, storeMessageRelaxed } from '@ton/core';
import { external, JettonMaster, JettonWallet, OpenedContract, WalletContractV4 } from '@ton/ton';
import nacl from 'tweetnacl';

export function getJettonMasterContract (tonApi: _TonApi, contractAddress: string) {
  const masterAddress = Address.parse(contractAddress);

  return tonApi.open(JettonMaster.create(masterAddress));
}

export async function getJettonWalletContract (jettonMasterContract: OpenedContract<JettonMaster>, tonApi: _TonApi, ownerAddress: string) {
  const walletAddress = Address.parse(ownerAddress);

  const jettonWalletAddress = await jettonMasterContract.getWalletAddress(walletAddress);

  return tonApi.open(JettonWallet.create(jettonWalletAddress));
}

export function sleep (ms: number) { // alibaba for test
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function externalMessage (contract: WalletContractV4, seqno: number, body: Cell) {
  return beginCell()
    .storeWritable(
      storeMessage(
        external({
          to: contract.address,
          init: seqno === 0 ? contract.init : undefined, // contract init for first transaction.
          body: body
        })
      )
    )
    .endCell();
}

export async function retry<T> (fn: () => Promise<T>, options: { retries: number, delay: number }): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < options.retries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof Error) {
        lastError = e;
      }

      await new Promise((resolve) => setTimeout(resolve, options.delay)); // wait for delay period, then recall the fn()
    }
  }

  throw lastError; // throw only last error, in case no successful result from fn()
}

export function getMessageTxStatus (txByMsgInfo: TxByMsgResponse) {
  const txDetailInfo = txByMsgInfo.transactions[0];
  const isCompute = txDetailInfo.description?.compute_ph?.success ?? false;
  const isAction = txDetailInfo.description?.action?.success ?? false;
  const isBounced = txDetailInfo.out_msgs[0]?.bounced ?? false;

  return isCompute && isAction && !isBounced;
}

// @ts-ignore
export async function getNativeTonTxStatus (tonApi: TonApi, internalMsgHash: string) {
  const internalTxInfoRaw = await tonApi.getTxByInMsg(internalMsgHash);

  return getMessageTxStatus(internalTxInfoRaw);
}

export async function getJettonTxStatus (tonApi: TonApi, jettonTransferMsgHash: string) {
  const jettonTransferTxInfoRaw = await tonApi.getTxByInMsg(jettonTransferMsgHash);
  const status = getMessageTxStatus(jettonTransferTxInfoRaw);

  if (status) { // Jetton Transfer success -> Check Jetton Internal Transfer
    const jettonTransferTxInfo = jettonTransferTxInfoRaw.transactions[0];
    const jettonInternalTransferHash = jettonTransferTxInfo.out_msgs[0]?.hash;
    const jettonInternalTransferTxInfoRaw = await tonApi.getTxByInMsg(jettonInternalTransferHash);

    return getMessageTxStatus(jettonInternalTransferTxInfoRaw); // Jetton Internal Transfer success -> Receiver successfully receiver fund!
  }

  return false;
}

export async function estimateTonTxFee (tonApi: _TonApi, messages: MessageRelaxed[], walletContract: WalletContractV4, _seqno?: number) {
  const contract = tonApi.open(walletContract);
  const seqno = _seqno ?? await contract.getSeqno();
  const isInit = seqno !== 0;

  const simulatedTxCell = contract.createTransfer({
    secretKey: Buffer.from(new Array(64)),
    seqno,
    messages
  });

  const estimateFeeInfo = await tonApi.estimateExternalMessageFee(walletContract, simulatedTxCell, isInit);

  return BigInt(
    estimateFeeInfo.source_fees.gas_fee +
    estimateFeeInfo.source_fees.in_fwd_fee +
    estimateFeeInfo.source_fees.storage_fee +
    estimateFeeInfo.source_fees.fwd_fee
  ) + EXTRA_TON_ESTIMATE_FEE;
}

export function messageRelaxedToCell (message: MessageRelaxed) {
  return beginCell().store(storeMessageRelaxed(message)).endCell();
}

export function cellToBase64Str (cell: Cell) {
  return cell.toBoc().toString('base64');
}

export function getWalletQueryId () {
  const swSignal = SW_QUERYID_HEX.toString(16);

  const swSignalBuffer = Buffer.from(swSignal, 'hex');
  const randomBuffer = nacl.randomBytes(4);
  const buffer = Buffer.concat([swSignalBuffer, randomBuffer]);

  return BigInt('0x' + buffer.toString('hex'));
}

export function isBounceableAddress (address: string) {
  return Address.isFriendly(address)
    ? Address.parseFriendly(address).isBounceable
    : true;
}

export function getTonSendMode (isTransferAll: boolean) {
  return isTransferAll
    ? SendMode.CARRY_ALL_REMAINING_BALANCE
    : SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS;
}
