// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { BridgeTransactionStatus } from '../interfaces';

/* Description */
export function getAvailBridgeClaimDescription (amount: string, symbol: string) {
  return `${amount} ${symbol} ready to claim from ${symbol} cross-chain transfer. Click to claim now!`;
}
/* Description */

// todo: can refactor utils and const of avail bridge to a new file. Also check in /transfer/xcm/availBridge.ts file

export const AVAIL_BRIDGE_INDEXER = {
  AVAIL_MAINNET: 'https://bridge-indexer.avail.so',
  AVAIL_TESTNET: 'https://turing-bridge-indexer.fra.avail.so'
};

export const AVAIL_BRIDGE_API = {
  AVAIL_MAINNET: 'https://bridge-api.avail.so',
  AVAIL_TESTNET: 'https://turing-bridge-api.fra.avail.so'
};

interface AvailBridgeTransactionsResponse {
  data: {
    paginationData: {
      hasNextPage: boolean,
      page: number,
      pageSize: number,
      totalCount: number
    },
    result: AvailBridgeTransaction[]
  }
}

export interface AvailBridgeTransaction {
  messageId: string,
  sourceChain: AvailBridgeSourceChain,
  sourceTransactionHash: string,
  depositorAddress: string,
  receiverAddress: string,
  amount: string,
  sourceBlockHash: string,
  sourceTransactionIndex: string,
  status: BridgeTransactionStatus
}

export enum AvailBridgeSourceChain {
  AVAIL = 'AVAIL',
  ETHEREUM = 'ETHEREUM',
}

export async function fetchAllAvailBridgeClaimable (address: string, sourceChain: AvailBridgeSourceChain, isTestnet: boolean) {
  const transactions: AvailBridgeTransaction[] = [];
  let isContinue = true;
  let page = 0;
  const pageSize = 100;

  while (isContinue) {
    const response = await fetchAvailBridgeTransactions(address, sourceChain, BridgeTransactionStatus.READY_TO_CLAIM, pageSize, page, isTestnet);

    if (!response) {
      break;
    }

    transactions.push(...filterClaimableOfAddress(address, response.data.result));

    isContinue = response.data.paginationData.hasNextPage;
    page = page + 1;
  }

  return transactions;
}

export async function fetchAvailBridgeTransactions (userAddress: string, sourceChain: AvailBridgeSourceChain, status: BridgeTransactionStatus, pageSize = 100, page = 0, isTestnet: boolean) {
  const params = new URLSearchParams({
    userAddress,
    sourceChain,
    status,
    pageSize: pageSize.toString(),
    page: page.toString()
  });

  try {
    const api = isTestnet ? AVAIL_BRIDGE_INDEXER.AVAIL_TESTNET : AVAIL_BRIDGE_INDEXER.AVAIL_MAINNET;
    const rawResponse = await fetch(
      `${api}/transactions?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        credentials: 'omit'
      }
    );

    if (!rawResponse.ok) {
      console.error('Error fetching claimable bridge transactions');

      return undefined;
    }

    return await rawResponse.json() as AvailBridgeTransactionsResponse;
  } catch (e) {
    console.error(e);

    return undefined;
  }
}

export function filterClaimableOfAddress (address: string, transactions: AvailBridgeTransaction[]) {
  return transactions.filter((transaction) => transaction.receiverAddress.toLowerCase() === address.toLowerCase());
}
