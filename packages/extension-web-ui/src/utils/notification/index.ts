// Copyright 2019-2022 @subwallet/extension-web-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountJson, AccountProxy, EarningRewardItem, UnstakingInfo, UnstakingStatus, YieldPoolInfo, YieldPoolType, YieldPositionInfo } from '@subwallet/extension-base/types';
import { isSameAddress } from '@subwallet/extension-base/utils';
import { BN_ZERO } from '@subwallet/extension-web-ui/constants';
import { findAccountByAddress } from '@subwallet/extension-web-ui/utils';
import BigN from 'bignumber.js';

export const getYieldRewardTotal = (slug: string, earningRewards: EarningRewardItem[], poolInfoMap: Record<string, YieldPoolInfo>, accounts: AccountJson[], isAllAccount: boolean, currentAccountProxy: AccountProxy | null, chainsByAccountType: string[]): string | undefined => {
  const checkAddress = (item: EarningRewardItem) => {
    if (isAllAccount) {
      const account = findAccountByAddress(accounts, item.address);

      return !!account;
    } else {
      return currentAccountProxy?.accounts.some(({ address }) => isSameAddress(address, item.address));
    }
  };

  const poolInfo = poolInfoMap[slug];

  if (poolInfo) {
    if (poolInfo.type !== YieldPoolType.NOMINATION_POOL) {
      return '0';
    } else {
      if (earningRewards.length) {
        let result = BN_ZERO;

        for (const reward of earningRewards) {
          if (reward.slug === slug && chainsByAccountType.includes(reward.chain) && poolInfoMap[slug]) {
            const isValid = checkAddress(reward);

            if (isValid) {
              result = result.plus(reward.unclaimedReward || '0');
            }
          }
        }

        return result.toString();
      } else {
        return undefined;
      }
    }
  } else {
    return undefined;
  }
};

export const getTotalWidrawable = (slug: string, poolInfoMap: Record<string, YieldPoolInfo>, yieldPositions: YieldPositionInfo[], currentAccountProxy: AccountProxy | null, isAllAccount: boolean, chainsByAccountType: string[], currentTimestampMs: number, address?: string): string | BigN => {
  const checkAddress = (item: YieldPositionInfo) => {
    if (isAllAccount) {
      if (address) {
        return isSameAddress(address, item.address);
      }

      return true;
    } else {
      return currentAccountProxy?.accounts.some(({ address: _address }) => {
        const compareAddress = address ? isSameAddress(address, _address) : true;

        return compareAddress && isSameAddress(_address, item.address);
      });
    }
  };

  const infoList: YieldPositionInfo[] = [];

  for (const info of yieldPositions) {
    if (info.slug === slug && chainsByAccountType.includes(info.chain) && poolInfoMap[info.slug]) {
      const isValid = checkAddress(info);
      const haveStake = new BigN(info.totalStake).gt(0);

      if (isValid && haveStake) {
        infoList.push(info);
      }
    }
  }

  let unstakings: UnstakingInfo[] = [];

  if (infoList.length) {
    if (isAllAccount && !address) {
      for (const info of infoList) {
        unstakings.push(...info.unstakings);
      }
    } else {
      unstakings = infoList[0].unstakings;
    }
  }

  if (unstakings && unstakings.length) {
    let result = BN_ZERO;

    unstakings.forEach((value) => {
      const canClaim = value.targetTimestampMs
        ? value.targetTimestampMs <= currentTimestampMs
        : value.status === UnstakingStatus.CLAIMABLE;

      if (canClaim) {
        result = result.plus(value.claimable);
      }
    });

    return result;
  } else {
    return '0';
  }
};
