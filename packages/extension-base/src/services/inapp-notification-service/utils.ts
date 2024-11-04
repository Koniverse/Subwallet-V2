// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainAsset } from '@subwallet/chain-list/types';
import { ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import { _getAssetDecimals, _getAssetSymbol } from '@subwallet/extension-base/services/chain-service/utils';
import { NotificationDescriptionMap, NotificationTitleMap } from '@subwallet/extension-base/services/inapp-notification-service/consts';
import { _BaseNotificationInfo, NotificationActionType, NotificationTab } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';
import { EarningRewardItem, UnstakingInfo, UnstakingStatus, YieldPoolType } from '@subwallet/extension-base/types';
import { formatNumber } from '@subwallet/extension-base/utils';

/* Description */
export function getWithdrawDescription (amount: string, symbol: string, stakingType: YieldPoolType) {
  if (stakingType === YieldPoolType.LIQUID_STAKING) {
    return `${amount} ${symbol} ready to withdraw from ${symbol} liquid staking. Click to withdraw now!`;
  }

  return `${amount} ${symbol} ready to withdraw from ${symbol} staking. Click to withdraw now!`;
}

export function getClaimDescription (amount: string, symbol: string) {
  return `${amount} ${symbol} ready to claim from ${symbol} staking. Click to claim now!`;
}

export function getSendDescription (amount: string, symbol: string) {
  return `You have just sent ${amount} ${symbol}`;
}

export function getReceiveDescription (amount: string, symbol: string) {
  return `You have just received ${amount} ${symbol}`;
}

export function getAvailBridgeClaimDescription (amount: string, symbol: string) {
  return `${amount} ${symbol} ready to claim from ${symbol} cross-chain transfer. Click to claim now!`;
}
/* Description */

export function getIsTabRead (notificationTab: NotificationTab) {
  if (notificationTab === NotificationTab.UNREAD) {
    return false;
  }

  if (notificationTab === NotificationTab.READ) {
    return true;
  }

  return undefined;
}

function createWithdrawNotification (amount: string, address: string, symbol: string, stakingSlug: string, stakingType: YieldPoolType): _BaseNotificationInfo {
  const actionType = NotificationActionType.WITHDRAW;
  const extrinsicType = ExtrinsicType.STAKING_WITHDRAW;
  const time = Date.now();

  return {
    id: `${actionType}___${stakingSlug}___${time}`,
    title: NotificationTitleMap[actionType].replace('{{tokenSymbol}}', symbol),
    description: NotificationDescriptionMap[actionType](amount, symbol, stakingType),
    address,
    time,
    extrinsicType,
    isRead: false,
    actionType,
    metadata: {
      stakingType,
      stakingSlug
    }
  };
}

export function createWithdrawNotifications (unstakingInfos: UnstakingInfo[], tokenInfo: _ChainAsset, address: string, stakingSlug: string, stakingType: YieldPoolType) {
  const allWithdrawNotifications: _BaseNotificationInfo[] = [];

  for (const unstaking of unstakingInfos) {
    if (unstaking.status !== UnstakingStatus.CLAIMABLE) {
      continue;
    }

    const rawClaimableAmount = unstaking.claimable;
    const decimals = _getAssetDecimals(tokenInfo);
    const symbol = _getAssetSymbol(tokenInfo);
    const amount = formatNumber(rawClaimableAmount, decimals);

    allWithdrawNotifications.push(createWithdrawNotification(amount, address, symbol, stakingSlug, stakingType));
  }

  return allWithdrawNotifications;
}

export function createClaimNotification (claimItemInfo: EarningRewardItem, tokenInfo: _ChainAsset): _BaseNotificationInfo {
  const { address, slug, type, unclaimedReward = '0' } = claimItemInfo;
  const decimals = _getAssetDecimals(tokenInfo);
  const symbol = _getAssetSymbol(tokenInfo);

  const amount = formatNumber(unclaimedReward, decimals);

  const actionType = NotificationActionType.CLAIM;
  const extrinsicType = ExtrinsicType.STAKING_CLAIM_REWARD;
  const time = Date.now();

  return {
    id: `${actionType}___${slug}___${time}`,
    title: NotificationTitleMap[actionType].replace('{{tokenSymbol}}', symbol),
    description: NotificationDescriptionMap[actionType](amount, symbol),
    address,
    time,
    extrinsicType,
    isRead: false,
    actionType,
    metadata: {
      stakingType: type,
      stakingSlug: slug
    }
  };
}

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
  status: AvailBridgeTransactionStatus
}

export enum AvailBridgeTransactionStatus {
  READY_TO_CLAIM = 'READY_TO_CLAIM',
  CLAIMED = 'CLAIMED',
  BRIDGED = 'BRIDGED'
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
    const response = await fetchAvailBridgeTransactions(address, sourceChain, AvailBridgeTransactionStatus.READY_TO_CLAIM, pageSize, page, isTestnet);

    if (!response) {
      break;
    }

    transactions.push(...filterClaimableOfAddress(address, response.data.result));

    isContinue = response.data.paginationData.hasNextPage;
    page = page + 1;
  }

  return transactions;
}

export async function fetchAvailBridgeTransactions (userAddress: string, sourceChain: AvailBridgeSourceChain, status: AvailBridgeTransactionStatus, pageSize = 100, page = 0, isTestnet: boolean) {
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

export function hrsToMillisecond (hours: number) {
  return hours * 60 * 60 * 1000;
}
