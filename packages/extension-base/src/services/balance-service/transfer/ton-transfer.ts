// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { WORKCHAIN } from '@subwallet/extension-base/services/balance-service/helpers/subscribe/ton/consts';
import { estimateTonTxFee, sleep } from '@subwallet/extension-base/services/balance-service/helpers/subscribe/ton/utils';
import { _TonApi } from '@subwallet/extension-base/services/chain-service/types';
import { keyring } from '@subwallet/ui-keyring';
import { fromNano, internal, MessageRelaxed } from '@ton/core';
import { Address, WalletContractV4 } from '@ton/ton';

interface TonTransactionConfigProps {
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
  messages: MessageRelaxed[]
  estimateFee: string;
  seqno: number
}

export async function createTonTransaction ({ from, networkKey, to, tonApi, transferAll, value }: TonTransactionConfigProps): Promise<[TonTransactionConfig, string]> {
  const keyPair = keyring.getPair(from);
  const tonAddress = Address.parse(from);
  const walletContract = WalletContractV4.create({ workchain: WORKCHAIN, publicKey: Buffer.from(keyPair.publicKey) });
  const contract = tonApi.open(walletContract);
  const seqno = await contract.getSeqno();

  let transferValue: string | undefined;

  const messages = [
    internal({
      to: to,
      value: fromNano(value),
      bounce: false // todo: check and update the send bounced logic
    })
  ];

  const estimateFee = await estimateTonTxFee(tonApi, messages, walletContract);

  if (transferAll) {
    await sleep(1500); // alibaba
    const balance = await tonApi.getBalance(tonAddress);

    transferValue = (balance - estimateFee).toString();
  }

  const transactionObject = {
    from,
    to,
    networkKey,
    value: transferValue ?? value,
    messages,
    estimateFee: estimateFee.toString(),
    seqno
  } as unknown as TonTransactionConfig;

  return [transactionObject, transactionObject.value];
}
