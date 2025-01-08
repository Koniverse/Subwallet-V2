// Copyright 2019-2022 @subwallet/extension-web-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ALL_ACCOUNT_KEY } from '@subwallet/extension-base/constants';
import { AbstractYieldPositionInfo, EarningStatus, LendingYieldPositionInfo, LiquidYieldPositionInfo, NativeYieldPositionInfo, NominationYieldPositionInfo, YieldPoolType, YieldPositionInfo } from '@subwallet/extension-base/types';
import { isSameAddress } from '@subwallet/extension-base/utils';
import { useGetChainSlugsByAccount, useSelector } from '@subwallet/extension-web-ui/hooks';
import BigN from 'bignumber.js';
import { useMemo } from 'react';

interface Result {
  compound: YieldPositionInfo | undefined;
  list: YieldPositionInfo[];
}

// Note: address is not All
const useYieldPositionDetail = (slug: string, address?: string): Result => {
  const { poolInfoMap, yieldPositions } = useSelector((state) => state.earning);
  const { currentAccountProxy, isAllAccount } = useSelector((state) => state.accountState);
  const chainsByAccountType = useGetChainSlugsByAccount();

  return useMemo(() => {
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

    if (infoList.length) {
      if (isAllAccount && !address) {
        const positionInfo = infoList[0];
        const base: AbstractYieldPositionInfo = {
          slug: slug,
          chain: positionInfo.chain,
          type: positionInfo.type,
          address: ALL_ACCOUNT_KEY,
          group: positionInfo.group,
          balanceToken: positionInfo.balanceToken,
          totalStake: '0',
          activeStake: '0',
          unstakeBalance: '0',
          nominations: [],
          status: EarningStatus.NOT_STAKING, // TODO
          unstakings: [],
          isBondedBefore: false
        };

        let rs: YieldPositionInfo;

        switch (positionInfo.type) {
          case YieldPoolType.LENDING:
            rs = {
              ...base,
              derivativeToken: positionInfo.derivativeToken
            } as LendingYieldPositionInfo;
            break;
          case YieldPoolType.LIQUID_STAKING:
            rs = {
              ...base,
              derivativeToken: positionInfo.derivativeToken
            } as LiquidYieldPositionInfo;
            break;
          case YieldPoolType.NATIVE_STAKING:
            rs = {
              ...base
            } as NativeYieldPositionInfo;
            break;
          case YieldPoolType.NOMINATION_POOL:
            rs = {
              ...base
            } as NominationYieldPositionInfo;
            break;
        }

        const statuses: EarningStatus[] = [];

        for (const info of infoList) {
          rs.totalStake = new BigN(rs.totalStake).plus(info.totalStake).toString();
          rs.activeStake = new BigN(rs.activeStake).plus(info.activeStake).toString();
          rs.unstakeBalance = new BigN(rs.unstakeBalance).plus(info.unstakeBalance).toString();
          rs.isBondedBefore = rs.isBondedBefore || info.isBondedBefore;
          rs.unstakings.push(...info.unstakings);
          statuses.push(info.status);
        }

        let status: EarningStatus;

        if (statuses.every((st) => st === EarningStatus.WAITING)) {
          status = EarningStatus.WAITING;
        } else if (statuses.every((st) => st === EarningStatus.NOT_EARNING)) {
          status = EarningStatus.NOT_EARNING;
        } else if (statuses.every((st) => st === EarningStatus.EARNING_REWARD)) {
          status = EarningStatus.EARNING_REWARD;
        } else {
          status = EarningStatus.PARTIALLY_EARNING;
        }

        rs.status = status;

        return {
          compound: rs,
          list: infoList
        };
      } else {
        return {
          compound: infoList[0],
          list: infoList
        };
      }
    } else {
      return {
        compound: undefined,
        list: infoList
      };
    }
  }, [isAllAccount, address, currentAccountProxy?.accounts, yieldPositions, slug, chainsByAccountType, poolInfoMap]);
};

export default useYieldPositionDetail;
