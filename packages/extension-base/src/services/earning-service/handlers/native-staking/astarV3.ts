// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { _ChainInfo } from '@subwallet/chain-list/types';
import { TransactionError } from '@subwallet/extension-base/background/errors/TransactionError';
import { APIItemState, BasicTxErrorType, ExtrinsicType, NominationInfo, UnstakingInfo } from '@subwallet/extension-base/background/KoniTypes';
import { getEarningStatusByNominations } from '@subwallet/extension-base/koni/api/staking/bonding/utils';
import { _EXPECTED_BLOCK_TIME, _STAKING_ERA_LENGTH_MAP } from '@subwallet/extension-base/services/chain-service/constants';
import { _SubstrateApi } from '@subwallet/extension-base/services/chain-service/types';
import BaseParaNativeStakingPoolHandler from '@subwallet/extension-base/services/earning-service/handlers/native-staking/base-para';
import { AstarDappV3PoolInfo, AstarDappV3PositionInfo, AstarV3ErrorType, BaseYieldPositionInfo, DappStakingV3Subperiod, EarningRewardItem, EarningStatus, OptimalYieldPath, PalletDappsStakingDappInfo, PalletDappStakingV3AccountLedger, PalletDappStakingV3ContractStakeAmount, PalletDappStakingV3DappInfo, PalletDappStakingV3EraRewardSpan, PalletDappStakingV3PeriodEndInfo, PalletDappStakingV3ProtocolState, PalletDappStakingV3SingularStakingInfo, PalletDappStakingV3StakeInfo, StakeCancelWithdrawalParams, SubmitJoinNativeStaking, SubmitYieldJoinData, TransactionData, UnstakingStatus, ValidatorInfo, YieldPoolInfo, YieldPoolMethodInfo, YieldPositionInfo, YieldStepBaseInfo, YieldStepType, YieldTokenBaseInfo } from '@subwallet/extension-base/types';
import { balanceFormatter, formatNumber, isUrl, reformatAddress } from '@subwallet/extension-base/utils';
import BigN from 'bignumber.js';
import fetch from 'cross-fetch';

import { SubmittableExtrinsic } from '@polkadot/api/promise/types';
import { UnsubscribePromise } from '@polkadot/api-base/types/base';
import { Codec } from '@polkadot/types/types';
import { BN, BN_ZERO } from '@polkadot/util';
import { isEthereumAddress } from '@polkadot/util-crypto';

const convertAddress = (address: string) => {
  return isEthereumAddress(address) ? address.toLowerCase() : address;
};

const isHasStakedCheck = (stakedInfo: PalletDappStakingV3StakeInfo): boolean => {
  return !(stakedInfo.voting === '0' && stakedInfo.buildAndEarn === '0' && stakedInfo.era === 0 && stakedInfo.period === 0);
};

const isHasStakedFutureCheck = (stakedInfo: PalletDappStakingV3StakeInfo): boolean => {
  return stakedInfo !== null;
};

const getPeriodEndInfo = (period: number, _periodEnd: any[]): PalletDappStakingV3PeriodEndInfo => {
  for (const periodEndInfo of _periodEnd) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
    const _periodNumber = periodEndInfo[0].toHuman() as string[];
    const periodNumber = parseInt(_periodNumber[0]);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
    const periodInfo = periodEndInfo[1].toHuman() as PalletDappStakingV3PeriodEndInfo;

    if (period === periodNumber) {
      return periodInfo;
    }
  }

  return {
    bonusRewardPool: '0',
    totalVpStake: '0',
    finalEra: '0'
  };
};

async function getStakerEraRange (chainApi: _SubstrateApi, address: string) {
  const rewardRetentionInPeriods = chainApi.api.consts.dappStaking.rewardRetentionInPeriods.toPrimitive() as unknown as number;
  const eraRewardSpanLength = chainApi.api.consts.dappStaking.eraRewardSpanLength.toPrimitive() as unknown as number;

  const [_protocolState, _ledger, _periodEnd] = await Promise.all([
    chainApi.api.query.dappStaking.activeProtocolState(),
    chainApi.api.query.dappStaking.ledger(address),
    chainApi.api.query.dappStaking.periodEnd.entries()
  ]);
  let rewardsExpired = false;

  const protocolState = _protocolState.toPrimitive() as unknown as PalletDappStakingV3ProtocolState;
  const ledger = _ledger.toPrimitive() as unknown as PalletDappStakingV3AccountLedger;
  const currentPeriod = protocolState.periodInfo.number;
  const firstStakedEra = Math.min(
    ledger.staked.era > 0 ? ledger.staked.era : Infinity,
    ledger.stakedFuture?.era ?? Infinity
  );
  const lastStakedPeriod = Math.max(
    ledger.staked.period,
    ledger.stakedFuture?.period ?? 0);
  let lastStakedEra = 0;

  if (lastStakedPeriod < currentPeriod - rewardRetentionInPeriods) {
    rewardsExpired = true;
  } else if (lastStakedPeriod < currentPeriod) {
    // Find last era from past period.
    const periodEnd = getPeriodEndInfo(lastStakedPeriod, _periodEnd);

    lastStakedEra = periodEnd?.finalEra ? parseInt(periodEnd.finalEra.replaceAll(',', '')) : 0; // periodInfo shouldn't be undefined for this case.
  } else if (lastStakedPeriod === currentPeriod) {
    // Find last era from current period.
    lastStakedEra = protocolState.era - 1;
  } else {
    // eslint-disable-next-line no-throw-literal
    throw 'Invalid operation.';
  }

  if (firstStakedEra > lastStakedEra) {
    rewardsExpired = true;
  }

  const firstSpanIndex = firstStakedEra - (firstStakedEra % eraRewardSpanLength);
  const lastSpanIndex = lastStakedEra - (lastStakedEra % eraRewardSpanLength);

  return {
    ledger,
    firstStakedEra,
    lastStakedEra,
    firstSpanIndex,
    lastSpanIndex,
    rewardsExpired,
    eraRewardSpanLength,
    lastStakedPeriod
  };
}

async function getStakerRewards (chainApi: _SubstrateApi, address: string) {
  // todo: review result structure
  // *** 1. Determine last claimable era.
  const { eraRewardSpanLength,
    firstSpanIndex,
    firstStakedEra,
    lastSpanIndex,
    lastStakedEra,
    lastStakedPeriod,
    ledger,
    rewardsExpired } = await getStakerEraRange(chainApi, address);

  const result = {
    amount: BN_ZERO,
    period: lastStakedPeriod,
    eraCount: 0
  };

  if (rewardsExpired) {
    return result.amount;
  }

  // *** 2. Create list of all claimable eras with stake amounts.
  const claimableEras: Map<number, BN> = new Map();

  for (let era = firstStakedEra; era <= lastStakedEra; era++) {
    let stakedSum = BN_ZERO;

    if (ledger.staked.era <= era && !ledger.stakedFuture) {
      stakedSum = stakedSum.add(new BN(ledger.staked.buildAndEarn)).add(new BN(ledger.staked.voting));
    } else if (ledger.stakedFuture) {
      if (ledger.stakedFuture.era <= era) {
        stakedSum = stakedSum.add(new BN(ledger.stakedFuture.buildAndEarn)).add(new BN(ledger.stakedFuture.voting));
      } else if (ledger.staked.era <= era) {
        stakedSum = stakedSum.add(new BN(ledger.staked.buildAndEarn)).add(new BN(ledger.staked.voting));
      }
    }

    claimableEras.set(era, stakedSum);
  }

  result.eraCount = claimableEras.size;

  // *** 3. Calculate rewards.
  for (let spanIndex = firstSpanIndex; spanIndex <= lastSpanIndex; spanIndex += eraRewardSpanLength) {
    const _eraRewards = await chainApi.api.query.dappStaking.eraRewards(spanIndex);
    const eraRewards = _eraRewards.toPrimitive() as unknown as PalletDappStakingV3EraRewardSpan;

    if (!eraRewards) {
      continue;
    }

    for (let era = eraRewards.firstEra; era <= eraRewards.lastEra; era++) {
      const staked = claimableEras.get(era);

      if (staked) {
        const eraIndex = era - eraRewards.firstEra;
        const bnStakerRewardPool = new BN(eraRewards.span[eraIndex].stakerRewardPool);
        const bnStaked = new BN(eraRewards.span[eraIndex].staked);
        const a = staked.mul(bnStakerRewardPool).div(bnStaked);

        result.amount = result.amount.add(a);
      }
    }
  }

  return result.amount;
}

async function getBonusRewards (chainApi: _SubstrateApi, address: string) {
  const _stakeInfo = await chainApi.api.query.dappStaking.stakerInfo.entries(address);
  const rewardRetentionInPeriods = chainApi.api.consts.dappStaking.rewardRetentionInPeriods.toPrimitive() as unknown as number;
  const _periodEnd = await chainApi.api.query.dappStaking.periodEnd.entries();
  const _activeProtocolState = await chainApi.api.query.dappStaking.activeProtocolState();
  const activeProtocolState = _activeProtocolState.toPrimitive() as unknown as PalletDappStakingV3ProtocolState;
  const currentPeriod = activeProtocolState.periodInfo.number;

  if (_stakeInfo.length === 0) {
    return BN_ZERO;
  }

  let totalBonus = BN_ZERO;

  for (const item of _stakeInfo) {
    const stakedInfo = item[1].toPrimitive() as unknown as PalletDappStakingV3SingularStakingInfo;
    const stakedData = stakedInfo.staked;
    const bnVoting = new BN(stakedData.voting);
    const stakedPeriod = stakedData.period;
    const isLoyalStaker = stakedInfo.loyalStaker;

    if (isLoyalStaker && bnVoting !== BN_ZERO && currentPeriod - stakedPeriod <= rewardRetentionInPeriods && currentPeriod - stakedPeriod > 0) {
      const periodEndInfo = getPeriodEndInfo(stakedPeriod, _periodEnd);
      const bnBonusRewardPool = new BN(periodEndInfo.bonusRewardPool);
      const bnTotalVpStake = new BN(periodEndInfo.totalVpStake);
      const bnBonusReward = bnVoting.mul(bnBonusRewardPool).div(bnTotalVpStake);

      totalBonus = totalBonus.add(bnBonusReward);
    }
  }

  return totalBonus;
}

export default class AstarV3NativeStakingPoolHandler extends BaseParaNativeStakingPoolHandler {
  protected override readonly availableMethod: YieldPoolMethodInfo = {
    join: true,
    defaultUnstake: true,
    fastUnstake: false,
    cancelUnstake: false,
    withdraw: true,
    claimReward: true
  };

  /* Subscribe pool info */

  async subscribePoolInfo (callback: (data: YieldPoolInfo) => void): Promise<VoidFunction> {
    let cancel = false;
    const nativeToken = this.nativeToken;

    const defaultCallback = async () => {
      const data: AstarDappV3PoolInfo = {
        ...this.baseInfo,
        type: this.type,
        metadata: {
          ...this.metadataInfo,
          description: this.getDescription()
        },
        isVotingSubperiod: false,
        isLastEra: false
      };

      const poolInfo = await this.getPoolInfo();

      !poolInfo && callback(data);
    };

    if (!this.isActive) {
      await defaultCallback();

      return () => {
        cancel = true;
      };
    }

    await defaultCallback();

    // todo: The API is deprecated, need update
    // const apyPromise = new Promise((resolve) => {
    //   fetch(`https://api.astar.network/api/v1/${this.chain}/dapps-staking/apy`, {
    //     method: 'GET'
    //   }).then((resp) => {
    //     resolve(resp.json());
    //   }).catch((e) => {
    //     console.error(e);
    //     resolve(null);
    //   });
    // });

    // const timeout = new Promise((resolve) => {
    //   const id = setTimeout(() => {
    //     clearTimeout(id);
    //     resolve(null);
    //   }, 8000);
    // });
    //
    // const apyRacePromise = Promise.race([
    //   timeout,
    //   apyPromise
    // ]); // need race because API often timeout

    // let apyInfo: null | number;
    //
    // try {
    //   apyInfo = (await apyRacePromise) as number | null;
    // } catch (e) {
    //   apyInfo = null;
    // }

    const substrateApi = await this.substrateApi.isReady;

    const unsub = await (substrateApi.api.query.dappStaking.activeProtocolState((_activeProtocolState: Codec) => {
      if (cancel) {
        unsub();

        return;
      }

      const activeProtocolState = _activeProtocolState.toPrimitive() as unknown as PalletDappStakingV3ProtocolState;
      const era = activeProtocolState.era;
      const subPeriod = activeProtocolState.periodInfo.subperiod;
      const nextSubperiodStartEra = activeProtocolState.periodInfo.nextSubperiodStartEra;
      const lastEra = parseInt(nextSubperiodStartEra) - 1;
      const isLastEra = subPeriod === DappStakingV3Subperiod.BUILD_AND_EARN && era === lastEra;

      const minDelegatorStake = substrateApi.api.consts.dappStaking.minimumStakeAmount.toString();
      const unlockingDelay = substrateApi.api.consts.dappStaking.unlockingPeriod.toString(); // in eras
      const maxNumberOfStakedContracts = substrateApi.api.consts.dappStaking.maxNumberOfStakedContracts.toString(); // todo: check this

      const eraTime = _STAKING_ERA_LENGTH_MAP[this.chain] || _STAKING_ERA_LENGTH_MAP.default; // in hours
      const unlockingPeriod = parseInt(unlockingDelay) * eraTime;
      const minToHuman = formatNumber(minDelegatorStake, nativeToken.decimals || 0, balanceFormatter);

      const data: AstarDappV3PoolInfo = {
        ...this.baseInfo,
        type: this.type,
        metadata: {
          ...this.metadataInfo,
          description: this.getDescription(minToHuman)
        },
        statistic: {
          assetEarning: [
            {
              slug: this.nativeToken.slug
              // apy: apyInfo !== null ? apyInfo : undefined
            }
          ],
          maxCandidatePerFarmer: parseInt(maxNumberOfStakedContracts), // temporary fix for Astar, there's no limit for now
          maxWithdrawalRequestPerFarmer: 1, // by default
          earningThreshold: {
            join: minDelegatorStake,
            defaultUnstake: '0',
            fastUnstake: '0'
          },
          farmerCount: 0, // TODO recheck=
          era: era,
          eraTime,
          tvl: undefined, // TODO recheck
          // totalApy: apyInfo !== null ? apyInfo : undefined, // TODO recheck
          unstakingPeriod: unlockingPeriod
        },
        isVotingSubperiod: subPeriod === DappStakingV3Subperiod.VOTING,
        isLastEra
      };

      console.log('data', data);

      callback(data);
    }) as unknown as UnsubscribePromise);

    return () => {
      cancel = true;
      unsub();
    };
  }

  /* Subscribe pool info */

  /* Subscribe pool position */

  async parseNominatorMetadata (chainInfo: _ChainInfo, address: string, substrateApi: _SubstrateApi, ledger: PalletDappStakingV3AccountLedger, bnLocked: BN): Promise<Omit<AstarDappV3PositionInfo, keyof BaseYieldPositionInfo>> {
    const nominationList: NominationInfo[] = [];
    const unlockingList: UnstakingInfo[] = [];

    const allDappsReq = new Promise((resolve) => {
      fetch(`https://api.astar.network/api/v3/${this.chain}/dapps-staking/chaindapps`, {
        method: 'GET'
      }).then((resp) => {
        resolve(resp.json());
      }).catch(console.error);
    });

    const [_activeProtocolState, _allDapps, _stakerInfo, _currentBlock] = await Promise.all([
      substrateApi.api.query.dappStaking.activeProtocolState(),
      allDappsReq,
      substrateApi.api.query.dappStaking.stakerInfo.entries(address),
      substrateApi.api.query.system.number()
    ]);

    const currentBlock = _currentBlock.toPrimitive() as string;
    const minDelegatorStake = substrateApi.api.consts.dappStaking.minimumStakeAmount.toString();
    const allDapps = _allDapps as PalletDappStakingV3DappInfo[];
    const activeProtocolState = _activeProtocolState.toPrimitive() as unknown as PalletDappStakingV3ProtocolState;
    const currentPeriod = activeProtocolState.periodInfo.number;
    const subperiod = activeProtocolState.periodInfo.subperiod;

    let bnTotalActiveStake = BN_ZERO;

    if (_stakerInfo.length > 0) {
      const dAppInfoMap: Record<string, PalletDappStakingV3DappInfo> = {};

      allDapps.forEach((dappInfo) => {
        dAppInfoMap[convertAddress(dappInfo.contractAddress)] = dappInfo;
      });

      //  todo: check previousStaked?
      for (const item of _stakerInfo) {
        const data = item[0].toHuman() as unknown as any[];
        const stakedDapp = data[1] as Record<string, string>;
        const _dappAddress = stakedDapp.Evm ? stakedDapp.Evm.toLowerCase() : stakedDapp.Wasm;
        const dappAddress = convertAddress(_dappAddress);

        const stakedInfo = item[1].toPrimitive() as unknown as PalletDappStakingV3SingularStakingInfo;
        const stakeData = stakedInfo.staked;
        const bnBuildAndEarn = new BN(stakeData.buildAndEarn);
        const bnVoting = new BN(stakeData.voting);
        const stakedPeriod = stakeData.period;

        const bnCurrentStake = bnBuildAndEarn.add(bnVoting) || new BN(0);

        if (bnCurrentStake.gt(BN_ZERO)) {
          // todo: check dApp unregistered?
          let dappEarningStatus = bnCurrentStake.gte(new BN(minDelegatorStake)) && currentPeriod === stakedPeriod ? EarningStatus.EARNING_REWARD : EarningStatus.NOT_EARNING;

          if (dappEarningStatus === EarningStatus.EARNING_REWARD && subperiod === DappStakingV3Subperiod.VOTING) {
            dappEarningStatus = EarningStatus.VOTING;
          }

          if (currentPeriod === stakedPeriod) {
            bnTotalActiveStake = bnTotalActiveStake.add(bnCurrentStake);
          }

          const dappInfo = dAppInfoMap[dappAddress];

          nominationList.push({
            status: dappEarningStatus,
            chain: chainInfo.slug,
            validatorAddress: dappAddress,
            activeStake: bnCurrentStake.toString(),
            validatorMinStake: '0',
            validatorIdentity: dappInfo?.contractAddress,
            hasUnstaking: false // unstake immediately moves the amount to lock balance.
          });
        }
      }
    }

    const unlockingChunks = ledger.unlocking;

    if (unlockingChunks.length > 0) {
      for (const unlockingChunk of unlockingChunks) {
        const amount = unlockingChunk.amount;
        const unlockBlock = unlockingChunk.unlockBlock;

        const remainingBlocks = parseInt(unlockBlock) - parseInt(currentBlock);
        const isClaimable = remainingBlocks <= 0;
        const currentTimestampMs = Date.now();
        const waitingTimeMs = remainingBlocks * _EXPECTED_BLOCK_TIME[chainInfo.slug] * 1000;

        // todo: recheck targetTimestampMs work suitably
        unlockingList.push({
          chain: chainInfo.slug,
          status: isClaimable ? UnstakingStatus.CLAIMABLE : UnstakingStatus.UNLOCKING,
          claimable: amount,
          // waitingTime
          targetTimestampMs: isClaimable ? undefined : currentTimestampMs + waitingTimeMs
        });
      }
    }

    /** Handle locked amount for pool position */
    if (nominationList.length === 0 && unlockingList.length === 0 && !bnLocked.gt(BN_ZERO)) {
      return {
        balanceToken: this.nativeToken.slug,
        totalLock: '0',
        totalStake: '0',
        unstakeBalance: '0',
        status: EarningStatus.NOT_STAKING,
        isBondedBefore: false,
        activeLock: '0',
        activeStake: '0',
        nominations: [],
        unstakings: []
      };
    }

    const stakingStatus = getEarningStatusByNominations(bnTotalActiveStake, nominationList);
    const unlockingBalance = unlockingList.reduce((old, currentValue) => {
      return old.add(new BN(currentValue.claimable));
    }, BN_ZERO);

    // todo: UI need to handle position by totallock, not totalStake
    return {
      status: stakingStatus,
      balanceToken: this.nativeToken.slug,
      totalLock: bnLocked.add(unlockingBalance).toString(),
      totalStake: bnTotalActiveStake.toString(),
      activeLock: bnLocked.sub(bnTotalActiveStake).toString(),
      activeStake: bnTotalActiveStake.toString(),
      unstakeBalance: unlockingBalance.toString(), // actually unlocking balance
      isBondedBefore: bnTotalActiveStake.gt(BN_ZERO),
      nominations: nominationList,
      unstakings: unlockingList
    };
  }

  async subscribePoolPosition (useAddresses: string[], resultCallback: (rs: YieldPositionInfo) => void): Promise<VoidFunction> {
    let cancel = false;
    const substrateApi = await this.substrateApi.isReady;
    const defaultInfo = this.baseInfo;
    const chainInfo = this.chainInfo;

    const unsub = await substrateApi.api.query.dappStaking.ledger.multi(useAddresses, async (ledgers: Codec[]) => {
      if (cancel) {
        unsub();

        return;
      }

      if (ledgers) {
        await Promise.all(ledgers.map(async (_ledger, i) => {
          const owner = reformatAddress(useAddresses[i], 42);

          const ledger = _ledger.toPrimitive() as unknown as PalletDappStakingV3AccountLedger;

          const bnLocked = new BN(ledger.locked);

          if (ledger && bnLocked.gt(BN_ZERO)) {
            const nominatorMetadata = await this.parseNominatorMetadata(chainInfo, owner, substrateApi, ledger, bnLocked);

            console.log('nominatorMetadata', nominatorMetadata);

            // todo: UI need display based on totalLock amount, not totalStake.
            // noted: stakeBalance is unlocking and it's a part of totalLock (not totalStake)

            resultCallback({
              ...defaultInfo,
              ...nominatorMetadata,
              address: owner,
              type: this.type
            });
          } else {
            resultCallback({
              ...defaultInfo,
              type: this.type,
              address: owner,
              balanceToken: this.nativeToken.slug,
              totalLock: '0',
              totalStake: '0',
              activeStake: '0',
              unstakeBalance: '0',
              isBondedBefore: false,
              status: EarningStatus.NOT_STAKING,
              nominations: [],
              unstakings: []
            });
          }
        }));
      }
    });

    return () => {
      cancel = true;
      unsub();
    };
  }

  /* Subscribe pool position */

  /* Get pool targets */

  async getPoolTargets (): Promise<ValidatorInfo[]> {
    const substrateApi = await this.substrateApi.isReady;
    // todo: check if there any limit on max staker on a dapp this

    const allDappsInfo: ValidatorInfo[] = [];

    // Get Dapp V3 info
    const allDappsReq = new Promise((resolve) => {
      fetch(`https://api.astar.network/api/v3/${this.chain}/dapps-staking/chaindapps`, {
        method: 'GET'
      }).then((resp) => {
        resolve(resp.json());
      }).catch(console.error);
    });

    // Get Dapp Name and Icon
    const allDappsExtra = new Promise((resolve) => {
      fetch(`https://api.astar.network/api/v1/${this.chain}/dapps-staking/dappssimple`, {
        method: 'GET'
      }).then((resp) => {
        resolve(resp.json());
      }).catch(console.error);
    });

    const [_activeProtocolState, _allDapps, _allDappsExtra, _contractInfo] = await Promise.all([
      substrateApi.api.query.dappStaking.activeProtocolState(),
      allDappsReq,
      allDappsExtra,
      substrateApi.api.query.dappStaking.contractStake.entries()
    ]);

    const activeProtocolState = _activeProtocolState.toPrimitive() as unknown as PalletDappStakingV3ProtocolState;
    const era = activeProtocolState.era;

    const allDapps = _allDapps as PalletDappStakingV3DappInfo[];
    const allDappsExt = _allDappsExtra as PalletDappsStakingDappInfo[];

    const allDappsExtMap: Record<string, PalletDappsStakingDappInfo> = {};

    allDappsExt.forEach((dappInfo) => {
      allDappsExtMap[dappInfo.address] = dappInfo;
    });

    const contractInfoMap: Record<string, PalletDappStakingV3ContractStakeAmount> = {};

    for (const contract of _contractInfo) {
      const _dappId = contract[0].toHuman() as string;
      const dappId = parseInt(_dappId);

      contractInfoMap[dappId] = contract[1].toHuman() as unknown as PalletDappStakingV3ContractStakeAmount;
    }

    allDapps.forEach((dappInfo) => {
      const dappAddress = dappInfo.contractAddress;
      const dappId = dappInfo.dappId;
      const stakersCount = dappInfo.stakersCount;
      // todo: check a  way to get dApp name.
      let dappName;
      let dappIcon;

      if (Object.keys(allDappsExtMap).includes(dappAddress)) {
        dappName = allDappsExtMap[dappAddress].name;
        dappIcon = isUrl(allDappsExtMap[dappAddress].iconUrl) ? allDappsExtMap[dappAddress].iconUrl : undefined;
      }

      const contractInfo = contractInfoMap[dappId];

      let totalStake = '0';

      if (contractInfo) {
        const staked = contractInfo.staked;
        const stakedFuture = contractInfo.stakedFuture;
        const isHasStaked = isHasStakedCheck(staked);
        const isHasStakedFuture = isHasStakedFutureCheck(stakedFuture);

        const eraStaked = staked?.era;
        const eraStakedFuture = stakedFuture?.era;

        // todo: check this
        // todo: check if need to store voting and B&E amount seperately

        if (isHasStakedFuture && eraStakedFuture <= era) {
          const bnVoting = new BigN(contractInfo.stakedFuture?.voting);
          const bnBuildAndEarn = new BigN(contractInfo.stakedFuture?.buildAndEarn);

          totalStake = bnVoting.plus(bnBuildAndEarn).toString();
        } else if (!isHasStakedFuture && isHasStaked && eraStaked <= era) {
          const bnVoting = new BigN(contractInfo.staked?.voting);
          const bnBuildAndEarn = new BigN(contractInfo.staked?.buildAndEarn);

          totalStake = bnVoting.plus(bnBuildAndEarn).toString();
        }
      }

      allDappsInfo.push({
        commission: 0,
        expectedReturn: 0,
        address: convertAddress(dappAddress),
        totalStake: totalStake,
        ownStake: '0',
        otherStake: totalStake.toString(),
        nominatorCount: stakersCount,
        blocked: false,
        isVerified: false,
        minBond: '0',
        icon: dappIcon || undefined,
        identity: dappName || undefined,
        chain: this.chain,
        isCrowded: false // stakerCount >= maxStakerPerContract
      });
    });

    return allDappsInfo;
  }

  /* Get pool targets */

  /* Get pool reward */

  override async getPoolReward (useAddresses: string[], callBack: (rs: EarningRewardItem) => void): Promise<VoidFunction> {
    let cancel = false;
    const chainApi = await this.substrateApi.isReady;

    for (const address of useAddresses) {
      if (!cancel) {
        const [stakerRewards, bonusRewards] = await Promise.all([
          getStakerRewards(chainApi, address),
          getBonusRewards(chainApi, address)
        ]);

        const totalRewards = stakerRewards.add(bonusRewards);

        if (totalRewards > BN_ZERO) {
          callBack({
            ...this.baseInfo,
            address: address,
            type: this.type,
            unclaimedReward: totalRewards.toString(),
            state: APIItemState.READY
          });
        }
      }
    }

    return () => {
      cancel = false;
    };
  }

  /* Get pool reward */

  /* Join pool action */

  override get defaultSubmitStep (): YieldStepBaseInfo {
    return [
      {
        name: 'Nominate dApps',
        type: YieldStepType.NOMINATE
      },
      {
        slug: this.nativeToken.slug,
        amount: '0'
      }
    ];
  }

  override async validateYieldJoin (data: SubmitYieldJoinData, path: OptimalYieldPath): Promise<TransactionError[]> {
    // todo: handle case stake in last era
    const chainApi = await this.substrateApi.isReady;
    const _activeProtocolState = await chainApi.api.query.dappStaking.activeProtocolState();
    const activeProtocolState = _activeProtocolState.toPrimitive() as unknown as PalletDappStakingV3ProtocolState;
    const era = activeProtocolState.era;
    const subPeriod = activeProtocolState.periodInfo.subperiod;
    const nextSubperiodStartEra = activeProtocolState.periodInfo.nextSubperiodStartEra;
    const lastEra = parseInt(nextSubperiodStartEra) - 1;
    const isLastEra = subPeriod === DappStakingV3Subperiod.BUILD_AND_EARN && era === lastEra;

    if (isLastEra) {
      return [new TransactionError(AstarV3ErrorType.CAN_NOT_JOIN_LAST_ERA, 'Cannot stake in the last era. Please wait to the next era')];
    }

    return await super.validateYieldJoin(data, path);
  }

  async createJoinExtrinsic (data: SubmitJoinNativeStaking, positionInfo?: AstarDappV3PositionInfo, bondDest = 'Staked'): Promise<[TransactionData, YieldTokenBaseInfo]> {
    // todo: handle case unclaim reward.
    // todo: NEED RECHECK ACTIVE LOCK
    // todo: check join dApp unregistered? Can be disable from getPoolTargets.
    const { amount, selectedValidators: targetValidators } = data;
    const chainApi = await this.substrateApi.isReady;
    const bnAmount = new BN(amount);

    // Get the current active locked amount = totalLock - totalUnlock - totalStake
    let bnActiveLock = BN_ZERO;

    if (positionInfo) {
      bnActiveLock = new BN(positionInfo.activeLock) || BN_ZERO;
    }

    const dappInfo = targetValidators[0];
    const dappParam = isEthereumAddress(dappInfo.address) ? { Evm: dappInfo.address } : { Wasm: dappInfo.address };

    let extrinsic: SubmittableExtrinsic;

    if (bnActiveLock.gt(BN_ZERO) && bnActiveLock.gte(bnAmount)) {
      extrinsic = chainApi.api.tx.dappStaking.stake(dappParam, bnAmount);
    } else if (bnActiveLock.gt(BN_ZERO) && bnActiveLock.lt(bnAmount)) {
      extrinsic = chainApi.api.tx.utility.batch([
        chainApi.api.tx.dappStaking.lock(bnAmount.sub(bnActiveLock)),
        chainApi.api.tx.dappStaking.stake(dappParam, bnAmount)
      ]);
    } else {
      extrinsic = chainApi.api.tx.utility.batch([
        chainApi.api.tx.dappStaking.lock(bnAmount),
        chainApi.api.tx.dappStaking.stake(dappParam, bnAmount)
      ]);
    }

    const tokenSlug = this.nativeToken.slug;

    return [extrinsic, { slug: tokenSlug, amount: '0' }];
  }

  /* Join pool action */

  /* Leave pool action */

  async handleYieldUnstake (amount: string, address: string, selectedTarget?: string): Promise<[ExtrinsicType, TransactionData]> {
    const chainApi = await this.substrateApi.isReady;

    // todo: handle case unclaim reward.
    // todo: Alert when user unstake make stake amount < voting.

    const bnAmount = new BN(amount);

    if (!selectedTarget) {
      return Promise.reject(new TransactionError(BasicTxErrorType.INVALID_PARAMS));
    }

    const dappParam = isEthereumAddress(selectedTarget) ? { Evm: selectedTarget } : { Wasm: selectedTarget };

    const extrinsic = chainApi.api.tx.dappStaking.unstake(dappParam, bnAmount);

    return [ExtrinsicType.STAKING_LEAVE_POOL, extrinsic];
  }

  /* Leave pool action */

  /* Other action */

  // todo: UI need add button to unlock
  async handleUnlock (amount: string) {
    const chainApi = await this.substrateApi.isReady;
    const bnAmount = new BN(amount);

    return chainApi.api.tx.dappStaking.unlock(bnAmount);
  }

  // todo: UI need add button to cancel unlock
  async handleCancelUnlock () {
    const chainApi = await this.substrateApi.isReady;

    return chainApi.api.tx.dappStaking.relockUnlocking();
  }

  async handleWithdrawUnlock (): Promise<TransactionData> {
    // todo: UI need to update the withdraw action to this function instead of Withdraw for unstake
    const chainApi = await this.substrateApi.isReady;

    return chainApi.api.tx.dappStaking.withdrawUnbonded();
  }

  override async handleYieldCancelUnstake (params: StakeCancelWithdrawalParams): Promise<TransactionData> {
    return Promise.reject(new TransactionError(BasicTxErrorType.UNSUPPORTED));
  }

  async handleYieldWithdraw (address: string, unstakingInfo: UnstakingInfo): Promise<TransactionData> {
    return Promise.reject(new TransactionError(BasicTxErrorType.UNSUPPORTED));
  }

  override async handleYieldClaimReward (address: string, bondReward?: boolean) {
    /*
    1. Get number of claim staker reward extrinsics
    2. Get all claim bonus reward extrinsics
    */
    const chainApi = await this.substrateApi.isReady;

    const allClaimRewardTxs: SubmittableExtrinsic[] = [];

    const eraRewardSpanLength = chainApi.api.consts.dappStaking.eraRewardSpanLength.toPrimitive() as unknown as number;
    const rewardRetentionInPeriods = chainApi.api.consts.dappStaking.rewardRetentionInPeriods.toPrimitive() as unknown as number;

    const [_stakedInfo, _ledger, _periodEnd, _activeProtocolState] = await Promise.all([
      chainApi.api.query.dappStaking.stakerInfo.entries(address),
      chainApi.api.query.dappStaking.ledger(address),
      chainApi.api.query.dappStaking.periodEnd.entries(),
      chainApi.api.query.dappStaking.activeProtocolState()
    ]);

    const ledger = _ledger.toPrimitive() as unknown as PalletDappStakingV3AccountLedger;
    const staked = ledger.staked;
    const stakedFuture = ledger.stakedFuture;
    const earnRewardPeriod = staked.period || stakedFuture.period;

    const isHasStaked = isHasStakedCheck(staked);
    const isHasStakedFuture = isHasStakedFutureCheck(stakedFuture);

    if (isHasStaked || isHasStakedFuture) {
      let firstEra = 0;
      let lastEra = 0;
      let numberClaims = 0;

      const activeProtocolState = _activeProtocolState.toPrimitive() as unknown as PalletDappStakingV3ProtocolState;
      const currentPeriod = activeProtocolState.periodInfo.number;
      const currentEra = activeProtocolState.era;

      // todo: there 3 cases: reward expired, reward are in the past period, reward are in the ongoing period. Check case reward expired
      if (currentPeriod === earnRewardPeriod) {
        firstEra = isHasStaked ? staked.era : isHasStakedFuture ? stakedFuture.era : 0;
        lastEra = currentEra - 1;
      } else if (currentPeriod > earnRewardPeriod && currentPeriod - earnRewardPeriod <= rewardRetentionInPeriods) {
        const oldestPeriod = currentPeriod - rewardRetentionInPeriods;
        const previousOldestPeriodEndInfo = getPeriodEndInfo(oldestPeriod - 1, _periodEnd);

        firstEra = isHasStaked ? staked.era : stakedFuture.era;
        lastEra = parseInt(previousOldestPeriodEndInfo.finalEra);
      }

      if (firstEra && lastEra) {
        const firstSpanIndex = (firstEra - (firstEra % eraRewardSpanLength)) / eraRewardSpanLength;
        const lastSpanIndex = (lastEra - (lastEra % eraRewardSpanLength)) / eraRewardSpanLength;

        numberClaims = lastSpanIndex - firstSpanIndex + 1;
      }

      for (let i = 0; i < numberClaims; i++) {
        const claimTx = chainApi.api.tx.dappStaking.claimStakerRewards();

        allClaimRewardTxs.push(claimTx);
      }
    }

    if (_stakedInfo.length > 0) {
      for (const item of _stakedInfo) {
        // todo: optimize by check a stake amount in build and earn period/check bonus reward available
        const addressInfo = item[0].toHuman() as any[];
        const stakeInfo = item[1].toPrimitive() as unknown as PalletDappStakingV3SingularStakingInfo;
        const voting = stakeInfo.staked.voting;
        const isLoyalStaker = stakeInfo.loyalStaker;

        if (voting && isLoyalStaker) {
          const stakedDapp = addressInfo[1] as Record<string, string>;
          const dappParam = isEthereumAddress(stakedDapp.Evm) ? { Evm: stakedDapp.Evm.toLowerCase() } : { Wasm: stakedDapp.Wasm };

          const claimBonusTx = chainApi.api.tx.dappStaking.claimBonusReward(dappParam);

          allClaimRewardTxs.push(claimBonusTx);
        }
      }
    }

    // todo: if claim action always available, handle case there's nothing to claim.
    return chainApi.api.tx.utility.batch(allClaimRewardTxs);
  }

  // todo: add button to cleanupExpiredStake
  // async handleCleanupExpiredStake (): Promise<TransactionData> {
  //   const chainApi = await this.substrateApi.isReady;
  //
  //   return chainApi.api.tx.dappStaking.cleanupExpiredEnntries();
  // }
  /* Other actions */
}
