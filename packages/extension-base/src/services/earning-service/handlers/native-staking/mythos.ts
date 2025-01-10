// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { TransactionError } from '@subwallet/extension-base/background/errors/TransactionError';
import { ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import { _STAKING_ERA_LENGTH_MAP } from '@subwallet/extension-base/services/chain-service/constants';
import BaseParaStakingPoolHandler from '@subwallet/extension-base/services/earning-service/handlers/native-staking/base-para';
import { BasicTxErrorType, EarningStatus, NativeYieldPoolInfo, SubmitJoinNativeStaking, TransactionData, UnstakingInfo, ValidatorInfo, YieldPoolInfo, YieldPositionInfo, YieldTokenBaseInfo } from '@subwallet/extension-base/types';
import { balanceFormatter, formatNumber, reformatAddress } from '@subwallet/extension-base/utils';

import { SubmittableExtrinsic } from '@polkadot/api/types';
import { UnsubscribePromise } from '@polkadot/api-base/types/base';
import { Codec } from '@polkadot/types/types';

interface FrameSupportTokensMiscIdAmountRuntimeFreezeReason {
  id: {
    CollatorStaking: string
  },
  amount: string
}

export default class MythosNativeStakingPoolHandler extends BaseParaStakingPoolHandler {
  /* Subscribe pool info */

  async subscribePoolInfo (callback: (data: YieldPoolInfo) => void): Promise<VoidFunction> {
    let cancel = false;
    const chainApi = this.substrateApi;
    const nativeToken = this.nativeToken;

    const defaultCallback = async () => {
      const data: NativeYieldPoolInfo = {
        ...this.baseInfo,
        type: this.type,
        metadata: {
          ...this.metadataInfo,
          description: this.getDescription()
        }
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

    await chainApi.isReady;

    const unsub = await (chainApi.api.query.collatorStaking.currentSession(async (_session: Codec) => {
      if (cancel) {
        unsub();

        return;
      }

      const currentSession = _session.toString();
      const maxStakers = chainApi.api.consts.collatorStaking.maxStakers.toString();
      const unstakeDelay = chainApi.api.consts.collatorStaking.stakeUnlockDelay.toString();
      const maxStakedCandidates = chainApi.api.consts.collatorStaking.maxStakedCandidates.toString();
      const sessionTime = _STAKING_ERA_LENGTH_MAP[this.chain] || _STAKING_ERA_LENGTH_MAP.default; // in hours
      const unstakingPeriod = parseInt(unstakeDelay) * sessionTime;

      const _minStake = await Promise.all([
        chainApi.api.query.collatorStaking.minStake()
      ]);

      const minStake = _minStake.toString();
      const minStakeToHuman = formatNumber(minStake, nativeToken.decimals || 0, balanceFormatter);

      const data: NativeYieldPoolInfo = {
        ...this.baseInfo,
        type: this.type,
        metadata: {
          ...this.metadataInfo,
          description: this.getDescription(minStakeToHuman)
        },
        statistic: {
          assetEarning: [
            {
              slug: this.nativeToken.slug
            }
          ],
          maxCandidatePerFarmer: parseInt(maxStakedCandidates),
          maxWithdrawalRequestPerFarmer: 1, // todo: recheck
          earningThreshold: {
            join: minStake,
            defaultUnstake: '0',
            fastUnstake: '0'
          },
          era: parseInt(currentSession),
          eraTime: sessionTime,
          unstakingPeriod: unstakingPeriod
          // tvl: totalStake.toString(), // todo
          // inflation
        },
        maxPoolMembers: parseInt(maxStakers)
      };

      callback(data);
    }) as unknown as UnsubscribePromise);

    return () => {
      cancel = true;
      unsub();
    };
  }

  /* Subscribe pool info */

  /* Subscribe pool position */

  async subscribePoolPosition (useAddresses: string[], resultCallback: (rs: YieldPositionInfo) => void): Promise<VoidFunction> {
    let cancel = false;
    const substrateApi = this.substrateApi;
    const defaultInfo = this.baseInfo;
    const unsub = await substrateApi.api.query.collatorStaking.candidateStake.multi(useAddresses, async (ledgers: Codec[]) => {
      if (cancel) {
        unsub();

        return;
      }

      if (ledgers) {
        await Promise.all(ledgers.map(async (candidateStake, i) => {
          const owner = reformatAddress(useAddresses[i], 42);

          resultCallback({ // todo: handle this
            ...defaultInfo,
            type: this.type,
            address: owner,
            balanceToken: this.nativeToken.slug,
            totalStake: '0',
            activeStake: '0',
            unstakeBalance: '0',
            status: EarningStatus.NOT_STAKING,
            isBondedBefore: false,
            nominations: [],
            unstakings: []
          });
        }));
      }
    });

    return () => {
      cancel = true;
      unsub();
    };
  }

  async parseCollatorMetadata () {
    // todo
    // collatorStaking.candidateStake
    // collatorStaking.userStake
  }

  /* Subscribe pool position */

  /* Get pool targets */

  async getPoolTargets (): Promise<ValidatorInfo[]> {
    // todo
    // collatorStaking.candidates

    return [] as ValidatorInfo[];
  }

  /* Get pool targets */

  /* Join pool action */

  async createJoinExtrinsic (data: SubmitJoinNativeStaking, positionInfo?: YieldPositionInfo): Promise<[TransactionData, YieldTokenBaseInfo]> {
    const apiPromise = await this.substrateApi.isReady;
    const { amount, selectedValidators } = data;

    let lockTx: SubmittableExtrinsic<'promise'> | undefined;
    let stakeTx: SubmittableExtrinsic<'promise'> | undefined;

    const selectedValidatorInfo = selectedValidators[0];

    const compoundTransactions = (bondTx: SubmittableExtrinsic<'promise'>, nominateTx: SubmittableExtrinsic<'promise'>): [TransactionData, YieldTokenBaseInfo] => {
      const extrinsic = apiPromise.api.tx.utility.batchAll([bondTx, nominateTx]);

      return [extrinsic, { slug: this.nativeToken.slug, amount: '0' }];
    };

    const _accountFreezes = await apiPromise.api.query.balances.freezes();
    const accountFreezes = _accountFreezes.toPrimitive() as unknown as FrameSupportTokensMiscIdAmountRuntimeFreezeReason[];
    const accountLocking = accountFreezes.filter((accountFreeze) => accountFreeze.id.CollatorStaking === 'Staking');

    if (!accountLocking || !accountLocking.length) {
      lockTx = apiPromise.api.tx.collatorStaking.lock(amount);
      stakeTx = apiPromise.api.tx.collatorStaking.stake([{
        candidate: selectedValidatorInfo.address,
        stake: amount
      }]);
    } else {
      const bnTotalLocking = accountLocking.reduce((old, currentLockAmount) => {
        const bnCurrentLockAmount = BigInt(currentLockAmount.amount);

        return old + bnCurrentLockAmount;
      }, BigInt(0));

      const lockAmount = (BigInt(amount) - bnTotalLocking).toString();

      lockTx = apiPromise.api.tx.collatorStaking.lock(lockAmount);
      stakeTx = apiPromise.api.tx.collatorStaking.stake([{
        candidate: selectedValidatorInfo.address,
        stake: amount
      }]);
    }

    return compoundTransactions(lockTx, stakeTx);
  }

  /* Join pool action */

  /* Leave pool action */

  async handleYieldUnstake (amount: string, address: string, selectedTarget?: string): Promise<[ExtrinsicType, TransactionData]> {
    const apiPromise = await this.substrateApi.isReady;
    const extrinsicList = [
      apiPromise.api.tx.collatorStaking.unstakeFrom(selectedTarget),
      apiPromise.api.tx.collatorStaking.unlock(amount) // todo: can disable amount to unlock all
    ];

    return [ExtrinsicType.STAKING_UNBOND, apiPromise.api.tx.utility.batch(extrinsicList)];
  }

  /* Leave pool action */

  /* Other action */

  async handleYieldCancelUnstake () {
    return Promise.reject(new TransactionError(BasicTxErrorType.UNSUPPORTED));
  }

  async handleYieldWithdraw (address: string, unstakingInfo: UnstakingInfo) {
    // todo: check UI
    const apiPromise = await this.substrateApi.isReady;

    return apiPromise.api.tx.collatorStaking.release();
  }

  /* Other action */
}
