// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { EXTRA_TON_ESTIMATE_FEE, TON_OPCODES } from '@subwallet/extension-base/services/balance-service/helpers/subscribe/ton/consts';
import { TxByMsgResponse } from '@subwallet/extension-base/services/balance-service/helpers/subscribe/ton/types';
import { _TonApi } from '@subwallet/extension-base/services/chain-service/types';
import { Address, beginCell, Cell, MessageRelaxed, storeMessage } from '@ton/core';
import { external, JettonMaster, JettonWallet, OpenedContract, WalletContractV4 } from '@ton/ton';

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
          init: seqno === 0 ? contract.init : undefined,
          body: body
        })
      )
    )
    .endCell();
}

export async function sendTonTransaction (boc: string) {
  const resp = await fetch(
    'https://testnet.toncenter.com/api/v2/sendBocReturnHash', { // todo: create function to get this api by chain
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        'X-API-KEY': '98b3eaf42da2981d265bfa6aea2c8d390befb6f677f675fefd3b12201bdf1bc3' // alibaba
      },
      body: JSON.stringify({
        boc: boc
      })
    }
  );

  const extMsgInfo = await resp.json() as {result: { hash: string}};

  return extMsgInfo.result.hash;
}

async function getTxByInMsg (extMsgHash: string): Promise<TxByMsgResponse> {
  const url = `https://testnet.toncenter.com/api/v3/transactionsByMessage?msg_hash=${encodeURIComponent(extMsgHash)}&direction=in`;
  const resp = await fetch(
    url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        'X-API-KEY': '98b3eaf42da2981d265bfa6aea2c8d390befb6f677f675fefd3b12201bdf1bc3' // alibaba
      }
    }
  );

  return await resp.json() as TxByMsgResponse;
}

async function retry<T> (fn: () => Promise<T>, options: { retries: number, delay: number }): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < options.retries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof Error) {
        lastError = e;
      }

      await new Promise((resolve) => setTimeout(resolve, options.delay));
    }
  }

  throw lastError;
}

async function getMessageTxStatus (txByMsgInfo: TxByMsgResponse) {
  const txDetailInfo = txByMsgInfo.transactions[0];
  const isCompute = txDetailInfo.description?.compute_ph?.success ?? false;
  const isAction = txDetailInfo.description?.action?.success ?? false;
  const isBounced = txDetailInfo.out_msgs[0]?.bounced ?? false;

  return isCompute && isAction && !isBounced;
}

async function getNativeTonTxStatus (internalMsgHash: string) {
  const internalTxInfoRaw = await getTxByInMsg(internalMsgHash);

  return getMessageTxStatus(internalTxInfoRaw);
}

async function getJettonTxStatus (jettonTransferMsgHash: string) {
  const jettonTransferTxInfoRaw = await getTxByInMsg(jettonTransferMsgHash);
  const status = await getMessageTxStatus(jettonTransferTxInfoRaw);

  if (status) { // Jetton Transfer success -> Check Jetton Internal Transfer
    const jettonInternalTxInfoRaw = await getTxByInMsg(jettonTransferMsgHash);

    return getMessageTxStatus(jettonInternalTxInfoRaw); // Jetton Internal Transfer success -> Receiver successfully receiver fund!
  }

  return false;
}

export async function getStatusByExtMsgHash (extMsgHash: string): Promise<[boolean, string]> {
  return retry(async () => {
    // get external msg transaction and transaction hex
    const externalTxInfoRaw = await getTxByInMsg(extMsgHash);
    const externalTxInfo = externalTxInfoRaw.transactions[0];
    const isExternalTxCompute = externalTxInfo.description.compute_ph.success;
    const isExternalTxAction = externalTxInfo.description.action.success;
    const base64Hex = externalTxInfo.hash;
    const hex = Buffer.from(base64Hex, 'base64').toString('hex');

    if (!(isExternalTxCompute && isExternalTxAction)) {
      return [false, hex];
    }

    // get out msg info from tx
    const internalMsgHash = externalTxInfo.out_msgs[0]?.hash;
    const opcode = parseInt(externalTxInfo.out_msgs[0]?.opcode || '0');

    if (internalMsgHash) { // notice to update opcode check when supporting more transaction type in ton blockchain
      const status = opcode === TON_OPCODES.JETTON_TRANSFER
        ? await getJettonTxStatus(internalMsgHash)
        : await getNativeTonTxStatus(internalMsgHash);

      return [status, hex];
    }

    throw new Error('Transaction not found');
  }, { retries: 10, delay: 3000 });
}

export async function estimateTonTxFee (tonApi: _TonApi, messages: MessageRelaxed[], walletContract: WalletContractV4, _seqno?: number) {
  const contract = tonApi.open(walletContract);
  const seqno = _seqno ?? await contract.getSeqno();

  const simulatedTxCell = contract.createTransfer({
    secretKey: Buffer.from(new Array(64)),
    seqno,
    messages
  });

  const estimateFeeInfo = await tonApi.estimateExternalMessageFee(walletContract.address, simulatedTxCell);

  console.log('estimateFeeInfo', estimateFeeInfo);
  console.log('estimateFee', (estimateFeeInfo.source_fees.gas_fee + estimateFeeInfo.source_fees.in_fwd_fee + estimateFeeInfo.source_fees.storage_fee + estimateFeeInfo.source_fees.fwd_fee).toString());

  return BigInt(
    estimateFeeInfo.source_fees.gas_fee +
    estimateFeeInfo.source_fees.in_fwd_fee +
    estimateFeeInfo.source_fees.storage_fee +
    estimateFeeInfo.source_fees.fwd_fee
  ) + EXTRA_TON_ESTIMATE_FEE;
}
