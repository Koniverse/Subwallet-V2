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

export function hrsToMillisecond (hours: number) {
  return hours * 60 * 60 * 1000;
}
