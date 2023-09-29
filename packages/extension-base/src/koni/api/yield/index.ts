// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { _ChainAsset, _ChainInfo } from '@subwallet/chain-list/types';
import { TransactionError } from '@subwallet/extension-base/background/errors/TransactionError';
import { ExtrinsicType, OptimalYieldPath, OptimalYieldPathParams, RequestBondingSubmit, RequestStakePoolingBonding, RequestYieldStepSubmit, StakingType, SubmitJoinNativeStaking, SubmitJoinNominationPool, SubmitYieldStepData, YieldAssetExpectedEarning, YieldCompoundingPeriod, YieldPoolInfo, YieldPoolType, YieldPositionInfo } from '@subwallet/extension-base/background/KoniTypes';
import { generatePathForAcalaLiquidStaking, getAcalaLiquidStakingExtrinsic, getAcalaLiquidStakingPosition, getAcalaLiquidStakingRedeem, subscribeAcalaLiquidStakingStats } from '@subwallet/extension-base/koni/api/yield/acalaLiquidStaking';
import { generatePathForBifrostLiquidStaking, getBifrostLiquidStakingExtrinsic, getBifrostLiquidStakingPosition, getBifrostLiquidStakingRedeem, subscribeBifrostLiquidStakingStats } from '@subwallet/extension-base/koni/api/yield/bifrostLiquidStaking';
import { YIELD_POOLS_INFO } from '@subwallet/extension-base/koni/api/yield/data';
import { generatePathForInterlayLending, getInterlayLendingExtrinsic, getInterlayLendingPosition, getInterlayLendingRedeem, subscribeInterlayLendingStats } from '@subwallet/extension-base/koni/api/yield/interlayLending';
import { generatePathForNativeStaking, getNativeStakingBondExtrinsic, getNativeStakingPosition, getNominationPoolJoinExtrinsic, getNominationPoolPosition, subscribeNativeStakingYieldStats } from '@subwallet/extension-base/koni/api/yield/nativeStaking';
import { generatePathForParallelLiquidStaking, getParallelLiquidStakingExtrinsic, getParallelLiquidStakingPosition, getParallelLiquidStakingRedeem, subscribeParallelLiquidStakingStats } from '@subwallet/extension-base/koni/api/yield/parallelLiquidStaking';
import { SubstrateApi } from '@subwallet/extension-base/services/chain-service/handler/SubstrateApi';
import { _SubstrateApi } from '@subwallet/extension-base/services/chain-service/types';

import { SubmittableExtrinsic } from '@polkadot/api/types';

// only apply for DOT right now, will need to scale up

export function subscribeYieldPoolStats (substrateApiMap: Record<string, _SubstrateApi>, chainInfoMap: Record<string, _ChainInfo>, assetInfoMap: Record<string, _ChainAsset>, callback: (rs: YieldPoolInfo) => void) {
  const unsubList: VoidFunction[] = [];

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  Object.values(YIELD_POOLS_INFO).forEach(async (poolInfo) => {
    if (!substrateApiMap[poolInfo.chain]) {
      return;
    }

    const substrateApi = await substrateApiMap[poolInfo.chain].isReady;
    const chainInfo = chainInfoMap[poolInfo.chain];

    if (YieldPoolType.NOMINATION_POOL === poolInfo.type) {
      const unsub = subscribeNativeStakingYieldStats(poolInfo, substrateApi, chainInfo, callback);

      // @ts-ignore
      unsubList.push(unsub);
    } else if (poolInfo.slug === 'DOT___bifrost_liquid_staking') {
      const unsub = subscribeBifrostLiquidStakingStats(poolInfo, assetInfoMap, callback);

      // @ts-ignore
      unsubList.push(unsub);
    } else if (poolInfo.slug === 'DOT___acala_liquid_staking') {
      const unsub = await subscribeAcalaLiquidStakingStats(substrateApi, chainInfoMap, poolInfo, callback);

      unsubList.push(unsub);
    } else if (poolInfo.slug === 'DOT___interlay_lending') {
      const unsub = subscribeInterlayLendingStats(poolInfo, callback);

      unsubList.push(unsub);
    } else if (poolInfo.slug === 'DOT___parallel_liquid_staking') {
      const unsub = subscribeParallelLiquidStakingStats(substrateApi, chainInfoMap, poolInfo, callback);

      unsubList.push(unsub);
    }
  });

  return () => {
    unsubList.forEach((unsub) => {
      unsub && unsub();
    });
  };
}

export function subscribeYieldPosition (substrateApiMap: Record<string, SubstrateApi>, addresses: string[], chainInfoMap: Record<string, _ChainInfo>, assetInfoMap: Record<string, _ChainAsset>, callback: (rs: YieldPositionInfo) => void) {
  const unsubList: VoidFunction[] = [];

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  Object.values(YIELD_POOLS_INFO).forEach(async (poolInfo) => {
    if (!substrateApiMap[poolInfo.chain]) {
      return;
    }

    const substrateApi = await substrateApiMap[poolInfo.chain].isReady;
    const chainInfo = chainInfoMap[poolInfo.chain];

    if (poolInfo.type === YieldPoolType.NATIVE_STAKING) {
      const unsub = await getNativeStakingPosition(substrateApi, addresses, chainInfo, poolInfo, callback);

      unsubList.push(unsub);
    } else if (poolInfo.type === YieldPoolType.NOMINATION_POOL) {
      const unsub = await getNominationPoolPosition(substrateApi, addresses, chainInfo, poolInfo, callback);

      unsubList.push(unsub);
    } else if (poolInfo.slug === 'DOT___bifrost_liquid_staking') {
      const unsub = getBifrostLiquidStakingPosition(substrateApi, ['5HU2x1QiUW4jJ5ykD1KLoVE8zryQkQcGAvbyD5rn7SyJedA9'], chainInfo, poolInfo, assetInfoMap, callback);

      unsubList.push(unsub);
    } else if (poolInfo.slug === 'DOT___acala_liquid_staking') {
      const unsub = getAcalaLiquidStakingPosition(substrateApi, ['5FRFxnokxd96gGF95BGcDVY4hnA1bd9GCoyMfTG2T23YdmeB'], chainInfo, poolInfo, assetInfoMap, callback);

      unsubList.push(unsub);
    } else if (poolInfo.slug === 'DOT___interlay_lending') {
      const unsub = getInterlayLendingPosition(substrateApi, ['wdCMiZ5wHTKM7qZUhjYNJNVhMCscsfKz27e1HHqyz9rSYf78A'], chainInfo, poolInfo, assetInfoMap, callback);

      unsubList.push(unsub);
    } else if (poolInfo.slug === 'DOT___parallel_liquid_staking') {
      const unsub = getParallelLiquidStakingPosition(substrateApi, ['p8ErK3S7WqHGLKfiyDaH2rfWnG1cgs5TnSh8892G7jQ6eM86Q'], chainInfo, poolInfo, assetInfoMap, callback);

      unsubList.push(unsub);
    }
  });

  return () => {
    unsubList.forEach((unsub) => {
      unsub && unsub();
    });
  };
}

export function calculateReward (apr: number, amount = 0, compoundingPeriod = YieldCompoundingPeriod.YEARLY, isApy = false): YieldAssetExpectedEarning {
  if (!apr) {
    return {};
  }

  if (!isApy) {
    const periodApr = apr / 365 * compoundingPeriod; // APR is always annually
    const earningRatio = (periodApr / 100) / compoundingPeriod;

    const periodApy = (1 + earningRatio) ** compoundingPeriod - 1;

    const reward = periodApy * amount;

    return {
      apy: periodApy,
      rewardInToken: reward
    };
  } else {
    const reward = apr * amount;

    return {
      apy: apr,
      rewardInToken: reward * (compoundingPeriod / YieldCompoundingPeriod.YEARLY)
    };
  }
}

export async function generateNaiveOptimalPath (params: OptimalYieldPathParams): Promise<OptimalYieldPath> {
  // 1. assume inputs are already validated
  // 2. generate paths based on amount only, not taking fee into account
  // 3. fees are calculated in the worst possible situation
  // 4. fees are calculated for the whole process, either user can pay all or nothing

  if (params.poolInfo.slug === 'DOT___bifrost_liquid_staking') {
    return generatePathForBifrostLiquidStaking(params);
  } else if (params.poolInfo.slug === 'DOT___acala_liquid_staking') {
    return generatePathForAcalaLiquidStaking(params);
  } else if (params.poolInfo.slug === 'DOT___interlay_lending') {
    return generatePathForInterlayLending(params);
  } else if (params.poolInfo.slug === 'DOT___parallel_liquid_staking') {
    return generatePathForParallelLiquidStaking(params);
  }

  return generatePathForNativeStaking(params);
}

// TODO: calculate token portion
// TODO: compare to ED
// TODO: compare to minAmount
// TODO: simulate the whole process, compare to fee (step by step)
export function validateYieldProcess (address: string, params: OptimalYieldPathParams, path: OptimalYieldPath, data?: SubmitYieldStepData | SubmitJoinNativeStaking | SubmitJoinNominationPool): TransactionError[] {
  return [];

  // const poolInfo = params.poolInfo;
  // const chainInfo = params.chainInfoMap[poolInfo.chain];
  //
  // if (['DOT___bifrost_liquid_staking', 'DOT___acala_liquid_staking'].includes(params.poolInfo.slug)) {
  //   return validateProcessForAcalaLiquidStaking(params, path);
  // } else if (params.poolInfo.type === YieldPoolType.NOMINATION_POOL) {
  //   if (!data) {
  //     return [new TransactionError(BasicTxErrorType.INTERNAL_ERROR)];
  //   }
  //
  //   const inputData = data as SubmitJoinNominationPool;
  //
  //   return validatePoolBondingCondition(chainInfo, inputData.amount, inputData.selectedPool, address, poolInfo.metadata as ChainStakingMetadata, inputData.nominatorMetadata);
  // }
  //
  // if (!data) {
  //   return [new TransactionError(BasicTxErrorType.INTERNAL_ERROR)];
  // }
  //
  // const inputData = data as SubmitJoinNativeStaking;
  //
  // return validateRelayBondingCondition(chainInfo, inputData.amount, inputData.selectedValidators, address, poolInfo.metadata as ChainStakingMetadata, inputData.nominatorMetadata);
}

export function validateYieldRedeem (address: string, poolInfo: YieldPoolInfo, amount: string): TransactionError[] {
  return [];
}

export interface HandleYieldStepData {
  txChain: string,
  extrinsicType: ExtrinsicType,
  extrinsic: SubmittableExtrinsic<'promise'>,
  txData: any,
  transferNativeAmount: string
}

export async function handleYieldStep (address: string, yieldPoolInfo: YieldPoolInfo, params: OptimalYieldPathParams, requestData: RequestYieldStepSubmit, path: OptimalYieldPath, currentStep: number): Promise<HandleYieldStepData> {
  if (yieldPoolInfo.type === YieldPoolType.NATIVE_STAKING) {
    const _data = requestData.data as SubmitJoinNativeStaking;
    const extrinsic = await getNativeStakingBondExtrinsic(address, params, _data);

    const bondingData: RequestBondingSubmit = {
      chain: yieldPoolInfo.chain,
      type: StakingType.NOMINATED,
      nominatorMetadata: _data.nominatorMetadata, // undefined if user has no stake
      amount: _data.amount,
      address,
      selectedValidators: _data.selectedValidators
    };

    return {
      txChain: yieldPoolInfo.chain,
      extrinsicType: ExtrinsicType.STAKING_BOND,
      extrinsic,
      txData: bondingData,
      transferNativeAmount: _data.amount
    };
  } else if (yieldPoolInfo.slug === 'DOT___acala_liquid_staking') {
    return getAcalaLiquidStakingExtrinsic(address, params, path, currentStep, requestData);
  } else if (yieldPoolInfo.slug === 'DOT___bifrost_liquid_staking') {
    return getBifrostLiquidStakingExtrinsic(address, params, path, currentStep, requestData);
  } else if (yieldPoolInfo.slug === 'DOT___parallel_liquid_staking') {
    return getParallelLiquidStakingExtrinsic(address, params, path, currentStep, requestData);
  } else if (yieldPoolInfo.slug === 'DOT___interlay_lending') {
    return getInterlayLendingExtrinsic(address, params, path, currentStep, requestData);
  }

  const _data = requestData.data as SubmitJoinNominationPool;
  const extrinsic = await getNominationPoolJoinExtrinsic(address, params, _data);

  const joinPoolData: RequestStakePoolingBonding = {
    nominatorMetadata: _data.nominatorMetadata,
    chain: yieldPoolInfo.chain,
    selectedPool: _data.selectedPool,
    amount: _data.amount,
    address
  };

  return {
    txChain: yieldPoolInfo.chain,
    extrinsicType: ExtrinsicType.STAKING_JOIN_POOL,
    extrinsic,
    txData: joinPoolData,
    transferNativeAmount: _data.amount
  };
}

export async function handleYieldRedeem (params: OptimalYieldPathParams, address: string, amount: string): Promise<[ExtrinsicType, SubmittableExtrinsic<'promise'>]> {
  if (params.poolInfo.slug === 'DOT___acala_liquid_staking') {
    return getAcalaLiquidStakingRedeem(params, amount);
  } else if (params.poolInfo.slug === 'DOT___parallel_liquid_staking') {
    return getParallelLiquidStakingRedeem(params, amount, address);
  } else if (params.poolInfo.slug === 'DOT___interlay_lending') {
    return getInterlayLendingRedeem(params, amount);
  }

  return getBifrostLiquidStakingRedeem(params, amount);
}
