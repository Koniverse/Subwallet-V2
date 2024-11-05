// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

export const POLYGON_BRIDGE_INDEXER = {
  MAINNET: 'https://api-gateway.polygon.technology/api/v3/transactions/mainnet',
  TESTNET: 'https://api-gateway.polygon.technology/api/v3/transactions/testnet'
};

interface PolygonTransaction {
  _id: string;
  transactionIndex?: number;
  sourceNetwork: number;
  destinationNetwork: number;
  blockNumber: number;
  amounts: string[];
  bridgeType: string;
  dataType: string;
  isDecoded?: boolean;
  status: string;
  timestamp: string;
  tokenIds: any[];
  transactionHash: string;
  userAddress: string;
  wrappedTokenAddress?: string;
  wrappedTokenNetwork?: number;
  counter?: number;
  bridgeContractAddress?: string;
  eventInitiatorAddress?: string;
  globalExitRootManager?: string;
  leaf?: string;
  mainnetExitRoot?: string;
  metadata?: string;
  originTokenAddress?: string;
  originTokenNetwork?: number;
  receiver?: string; // empty when not claimed
  refuel?: boolean;
  rollUpExitRoot?: string;
  nonce?: any;
  rootTunnelAddress?: string;
  claimContractAddress?: string;
  claimTransactionBlockNumber?: number;
  claimTransactionHash?: string;
  claimTransactionTimestamp?: string;
  transactionInitiator?: string;
}

interface PaginationData {
  hasNextPage: boolean;
  page: number;
  pageSize: number;
  totalCount: number;
}

interface LastCheckpoint {
  _id: string;
  proposer: string;
  checkpointNumber: number;
  reward: number;
  start: number;
  end: number;
  root: string;
  transactionHash: string;
  timestamp: number;
  __v: number;
}

interface PolygonTransactionResponse {
  success: boolean;
  result: PolygonTransaction[];
  paginationData: PaginationData;
  posWithdrawInterval: number;
  lastCheckpoint: LastCheckpoint;
}

/* Description */
export function getWaitPolygonBridgeDescription (amount: string, symbol: string) {
  return `${amount} ${symbol} will arrive in 30 minutes from Polygon Unified Bridge!`;
}
/* Description */

export async function fetchPolygonBridgeTransactions (userAddress: string, pageSize = 500, page = 0, isTestnet = true) {
  const params = new URLSearchParams({
    userAddress,
    pageSize: pageSize.toString(),
    page: page.toString()
  });

  const networkIds = [0, 1];

  networkIds.forEach((networkId) => {
    params.append('destinationNetworkIds', networkId.toString());
    params.append('sourceNetworkIds', networkId.toString());
  });

  try {
    const domain = isTestnet ? POLYGON_BRIDGE_INDEXER.TESTNET : POLYGON_BRIDGE_INDEXER.MAINNET;
    const rawResponse = await fetch(
      `${domain}?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'x-api-key': 'polygonag_4RFN-g_wt2o12GmK9WWOWrGf-4Hamhtd'
        },
        credentials: 'omit'
      }
    );

    if (!rawResponse.ok) {
      console.error('Error fetching claimable bridge transactions');

      return undefined;
    }

    return await rawResponse.json() as PolygonTransactionResponse;
  } catch (e) {
    console.error(e);

    return undefined;
  }
}
