// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainAsset } from '@subwallet/chain-list/types';
import { ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import { NotificationDescriptionMap, NotificationTitleMap } from '@subwallet/extension-base/services/inapp-notification-service/consts';
import { _NotificationInfo, NotificationActionType, NotificationTab } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';
import { EarningRewardItem, UnstakingInfo, UnstakingStatus, YieldPoolType } from '@subwallet/extension-base/types';
import { formatNumber } from '@subwallet/extension-base/utils';

export function getWithdrawDescription (amount: string, symbol: string, stakingType: YieldPoolType) {
  return `You has ${amount} ${symbol} ${stakingType} to withdraw`;
}

export function getClaimDescription (amount: string, symbol: string, stakingType: YieldPoolType) {
  return `You has ${amount} ${symbol} ${stakingType} to claim`;
}

export function getSendDescription (amount: string, symbol: string) {
  return `You have just sent ${amount} ${symbol}`;
}

export function getReceiveDescription (amount: string, symbol: string) {
  return `You have just received ${amount} ${symbol}`;
}

export const getIsTabRead = (notificationTab: NotificationTab) => {
  if (notificationTab === NotificationTab.UNREAD) {
    return false;
  }

  if (notificationTab === NotificationTab.READ) {
    return true;
  }

  return undefined;
};

function createWithdrawNotification (amount: string, address: string, symbol: string, stakingSlug: string, stakingType: YieldPoolType): _NotificationInfo {
  const actionType = NotificationActionType.WITHDRAW;
  const extrinsicType = ExtrinsicType.STAKING_WITHDRAW;
  const time = Date.now();

  return {
    id: `${actionType}___${stakingSlug}___${time}`,
    title: NotificationTitleMap[actionType],
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
  const allWithdrawNotifications: _NotificationInfo[] = [];

  for (const unstaking of unstakingInfos) {
    if (unstaking.status !== UnstakingStatus.CLAIMABLE) {
      continue;
    }

    const rawClaimableAmount = unstaking.claimable;
    const decimal = tokenInfo.decimals || 0;
    const symbol = tokenInfo.symbol;
    const amount = formatNumber(rawClaimableAmount, decimal);

    allWithdrawNotifications.push(createWithdrawNotification(amount, address, symbol, stakingSlug, stakingType));
  }

  return allWithdrawNotifications;
}

export function createClaimNotification (claimItemInfo: EarningRewardItem, tokenInfo: _ChainAsset): _NotificationInfo {
  const { address, slug, type, unclaimedReward = '0' } = claimItemInfo;
  const { decimals, symbol } = tokenInfo;

  const amount = formatNumber(unclaimedReward, decimals || 0);

  const actionType = NotificationActionType.CLAIM;
  const extrinsicType = ExtrinsicType.STAKING_CLAIM_REWARD;
  const time = Date.now();

  return {
    id: `${actionType}___${slug}___${time}`,
    title: NotificationTitleMap[actionType],
    description: NotificationDescriptionMap[actionType](amount, symbol, type),
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
