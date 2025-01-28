// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AmountData, RequestMaxTransferable } from '@subwallet/extension-base/background/KoniTypes';
import { RequestOptimalTransferProcess } from '@subwallet/extension-base/services/balance-service/helpers';
import { SWTransactionResponse } from '@subwallet/extension-base/services/transaction-service/types';
import { RequestCrossChainTransfer, TokenSpendingApprovalParams } from '@subwallet/extension-base/types';
import { RequestSubmitTransfer, RequestSubscribeTransfer, ResponseSubscribeTransfer } from '@subwallet/extension-base/types/balance/transfer';
import { CommonOptimalPath } from '@subwallet/extension-base/types/service-base';

import { sendMessage } from '../base';

export async function makeTransfer (request: RequestSubmitTransfer): Promise<SWTransactionResponse> {
  return sendMessage('pri(accounts.transfer)', request);
}

export async function makeCrossChainTransfer (request: RequestCrossChainTransfer): Promise<SWTransactionResponse> {
  return sendMessage('pri(accounts.crossChainTransfer)', request);
}

export async function approveSpending (request: TokenSpendingApprovalParams): Promise<SWTransactionResponse> {
  return sendMessage('pri(accounts.approveSpending)', request);
}

export async function getMaxTransfer (request: RequestMaxTransferable): Promise<AmountData> {
  return sendMessage('pri(transfer.getMaxTransferable)', request);
}

export async function subscribeMaxTransfer (request: RequestSubscribeTransfer, callback: (data: ResponseSubscribeTransfer) => void): Promise<ResponseSubscribeTransfer> {
  return sendMessage('pri(transfer.subscribe)', request, callback);
}

export async function getOptimalTransferProcess (request: RequestOptimalTransferProcess): Promise<CommonOptimalPath> {
  return sendMessage('pri(accounts.getOptimalTransferProcess)', request);
}
