// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { _ChainInfo } from '@subwallet/chain-list/types';
import { TransactionError } from '@subwallet/extension-base/background/errors/TransactionError';
import { APIItemState, ExtrinsicType, NominationInfo, NominatorMetadata, StakingItem, StakingType } from '@subwallet/extension-base/background/KoniTypes';
import { BITTENSOR_REFRESH_STAKE_APY, BITTENSOR_REFRESH_STAKE_INFO } from '@subwallet/extension-base/constants';
import { getBondedValidators, getEarningStatusByNominations } from '@subwallet/extension-base/koni/api/staking/bonding/utils';
import { _SubstrateApi } from '@subwallet/extension-base/services/chain-service/types';
import { _getChainNativeTokenBasicInfo } from '@subwallet/extension-base/services/chain-service/utils';
import BaseNativeStakingPoolHandler from '@subwallet/extension-base/services/earning-service/handlers/native-staking/base';
import { EarningStatus, NativeYieldPoolInfo, OptimalYieldPath, StakeCancelWithdrawalParams, SubmitJoinNativeStaking, SubmitYieldJoinData, TransactionData, UnstakingInfo, ValidatorInfo, YieldPoolInfo, YieldPositionInfo, YieldTokenBaseInfo } from '@subwallet/extension-base/types';
import { reformatAddress } from '@subwallet/extension-base/utils';

import { SubmittableExtrinsic } from '@polkadot/api/types';
import { BN, BN_ZERO } from '@polkadot/util';

interface TaoStakingStakeOption {
  owner: string,
  amount: string,
}

interface RawDelegateState {
  data: {
    delegateBalances: {
      nodes:
      Array<Record<string, string>>
    }
  }
}

export default class TaoNativeStakingPoolHandler extends BaseNativeStakingPoolHandler {
  /* Unimplemented function  */

  // eslint-disable-next-line @typescript-eslint/require-await
  async subscribePoolPosition (useAddresses: string[], callback: (rs: YieldPositionInfo) => void): Promise<VoidFunction> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async handleYieldWithdraw (address: string, unstakingInfo: UnstakingInfo): Promise<TransactionData> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async handleYieldCancelUnstake (params: StakeCancelWithdrawalParams): Promise<TransactionData> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async validateYieldJoin (data: SubmitYieldJoinData, path: OptimalYieldPath): Promise<TransactionError[]> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async validateYieldLeave (amount: string, address: string, fastLeave: boolean, selectedTarget?: string): Promise<TransactionError[]> {
    throw new Error('Method not implemented.');
  }

  /* Unimplemented function  */

  readonly testnetDelegate = {
    '5Fjp4r8cvWexkWUVb756LkopTVjmzXHBT4unpDN6SzwmQq8E': {
      name: 'TaoPolishNode',
      url: 'https://taonode.io',
      description: 'This node is a collective effort of the polish community. We are engaged in evangelizing the project, educating and sharing the knowledge.',
      signature: '1ca20d4e99a48f400dd9cd4aeca8447da6ab1979e480a1dafddfc52e45e215177c7cdde85f5d042d59a5b1169981afa8d1ae28328e2fc5ce57c3d748c8d09d81'
    },
    '5DG4VHT3gKZDEQ3Tx4oVPpejaz64FeDtNPhbAYTLFBmygHUW': {
      name: 'WaveTensor',
      url: 'https://twitter.com/wavetensor',
      description: 'A new Wave is coming, join the AI revolution on top of Bittensor by staking with us.',
      signature: '5e072b4752ccbdd4ca3298f336284dfdab347dd133850f4d2f9873e7ea59bd2a8f201732842ec79d2bab3abaf133a06b6bd992940389e42d57802c9b8f855889'
    }
  };

  async fetchDelegates (): Promise<Array<Record<string, string>>> {
    return new Promise(function (resolve) {
      fetch('https://raw.githubusercontent.com/opentensor/bittensor-delegates/main/public/delegates.json', {
        // Todo: check if this is exactly active validator list info or not
        method: 'GET'
      }).then((resp) => {
        resolve(resp.json());
      }).catch(console.error);
    });
  }

  async fetchStakingInfo (): Promise<Array<Record<string, string>>> {
    return new Promise(function (resolve) {
      fetch('https://taostats.io/data.json', {
        method: 'GET'
      }).then((resp) => {
        resolve(resp.json());
      }).catch(console.error);
    });
  }

  /* Subscribe pool info */

  async subscribePoolInfo (callback: (data: YieldPoolInfo) => void): Promise<VoidFunction> {
    let cancel = false;
    const substrateApi = this.substrateApi;

    const updateStakingInfo = async () => {
      try {
        if (cancel) {
          return;
        }

        const _expectedReturn = (await this.fetchStakingInfo())[0];
        const expectedReturn = _expectedReturn.staking_apy as unknown as number;
        const minDelegatorStake = substrateApi.api.consts.parachainStaking.minDelegatorStake.toString();
        const delegatorStorages = await substrateApi.api.query.parachainStaking.identities.keys();
        const maxRegistrationPerBlock = substrateApi.api.query.parachainStaking.maxRegistrationPerBlock?.toString();
        const data: NativeYieldPoolInfo = {
          ...this.baseInfo,
          type: this.type,
          metadata: {
            ...this.metadataInfo,
            description: this.getDescription('0')
          },
          statistic: {
            assetEarning: [
              {
                slug: this.nativeToken.slug,
                apy: expectedReturn
              }
            ],
            maxCandidatePerFarmer: 999,
            maxWithdrawalRequestPerFarmer: 1,
            earningThreshold: {
              join: minDelegatorStake,
              defaultUnstake: '0',
              fastUnstake: '0'
            },
            farmerCount: delegatorStorages.length,
            era: 0,
            eraTime: 0,
            tvl: '',
            totalApy: expectedReturn,
            unstakingPeriod: 0
          },
          maxPoolMembers: maxRegistrationPerBlock ? parseInt(maxRegistrationPerBlock) : undefined
        };

        callback(data);
      } catch (error) {
        console.error(error);
      }
    };

    const subscribeStakingMetadataInterval = () => {
      updateStakingInfo().catch(console.error);
    };

    await substrateApi.isReady;

    subscribeStakingMetadataInterval();
    const interval = setInterval(subscribeStakingMetadataInterval, BITTENSOR_REFRESH_STAKE_APY);

    return () => {
      cancel = true;
      clearInterval(interval);
    };
  }

  /* Subscribe pool position */
  // eslint-disable-next-line @typescript-eslint/require-await
  async parseNominatorMetadata (chainInfo: _ChainInfo, address: string, delegatorState: TaoStakingStakeOption[]) {
    const nominationList: NominationInfo[] = [];
    let allActiveStake = BN_ZERO;

    for (const delegate of delegatorState) {
      const activeStake = delegate.amount;
      const bnActiveStake = new BN(activeStake);

      if (bnActiveStake.gt(BN_ZERO)) {
        const delegationStatus = EarningStatus.EARNING_REWARD;

        allActiveStake = allActiveStake.add(bnActiveStake);

        nominationList.push({
          status: delegationStatus,
          chain: this.chain,
          validatorAddress: delegate.owner,
          activeStake: activeStake,
          validatorMinStake: '0'
        });
      }
    }

    const stakingStatus = getEarningStatusByNominations(allActiveStake, nominationList);

    return {
      chain: chainInfo.slug,
      type: StakingType.NOMINATED,
      status: stakingStatus,
      address: address,
      activeStake: allActiveStake.toString(),
      nominations: nominationList,
      unstakings: []
    } as NominatorMetadata;
  }

  /* Subscribe pool position */

  /* Get pool targets */

  async getPoolTargets (): Promise<ValidatorInfo[]> {
    let _allDelegates;

    if (this.chain === 'bittensor_testnet') {
      _allDelegates = this.testnetDelegate;
    } else {
      _allDelegates = await this.fetchDelegates();
    }

    const allDelegates = _allDelegates as Record<string, Record<string, string>>;
    const delegateAddresses = Object.keys(allDelegates);
    const minDelegatorStake = this.substrateApi.api.consts.parachainStaking.nominatiorMinRequiredStaking.toString();
    const minDelegate = new BN(minDelegatorStake);

    return delegateAddresses.map((address) => {
      const name = allDelegates[address].name;

      return {
        address: address,
        totalStake: '0',
        ownStake: '0',
        otherStake: '0',
        minBond: minDelegate.toString(),
        nominatorCount: 0,
        commission: 0,
        expectedReturn: 0,
        blocked: false,
        isVerified: false,
        chain: this.chain,
        isCrowded: false,
        identity: name
      } as ValidatorInfo;
    });
  }

  /* Get pool targets */

  /* Join pool action */

  async createJoinExtrinsic (data: SubmitJoinNativeStaking, positionInfo?: YieldPositionInfo, bondDest = 'Staked'): Promise<[TransactionData, YieldTokenBaseInfo]> {
    const { address, amount, selectedValidators: targetValidators } = data;
    const chainApi = await this.substrateApi.isReady;
    const binaryAmount = new BN(amount);
    const poolPosition = await this.getPoolPosition(address);
    const selectedValidatorInfo = targetValidators[0];

    // eslint-disable-next-line @typescript-eslint/require-await
    const compoundResult = async (extrinsic: SubmittableExtrinsic<'promise'>): Promise<[TransactionData, YieldTokenBaseInfo]> => {
      const tokenSlug = this.nativeToken.slug;

      return [extrinsic, { slug: tokenSlug, amount: '0' }];
    };

    if (!poolPosition) {
      const extrinsic = chainApi.api.tx.subtensorModule.addStake(selectedValidatorInfo.address, binaryAmount);

      return compoundResult(extrinsic);
    }

    const { bondedValidators } = getBondedValidators(poolPosition.nominations);

    if (!bondedValidators.includes(reformatAddress(selectedValidatorInfo.address, 0))) {
      const extrinsic = chainApi.api.tx.subtensorModule.addStake(selectedValidatorInfo.address, binaryAmount);

      return compoundResult(extrinsic);
    } else {
      const extrinsic = chainApi.api.tx.subtensorModule.increaseTake(selectedValidatorInfo.address, binaryAmount);

      return compoundResult(extrinsic);
    }
  }

  /* Join pool action */

  /* Leave pool action */

  async handleYieldUnstake (amount: string, hotkey: string, selectedTarget?: string): Promise<[ExtrinsicType, TransactionData]> {
    const chainApi = await this.substrateApi.isReady;
    const binaryAmount = new BN(amount);

    let extrinsic: SubmittableExtrinsic<'promise'>;

    // eslint-disable-next-line prefer-const
    extrinsic = chainApi.api.tx.subtensorModule.removeStake(hotkey, binaryAmount);

    return [ExtrinsicType.STAKING_UNBOND, extrinsic];
  }

  /* Leave pool action */

  private static parseDelegateState (address: string) {
    return {
      query: 'query ($first: Int!, $after: Cursor, $filter: DelegateBalanceFilter, $order: [DelegateBalancesOrderBy!]!) {  delegateBalances(first: $first, after: $after, filter: $filter, orderBy: $order) { nodes { id account delegate amount updatedAt delegateFrom } pageInfo { endCursor hasNextPage hasPreviousPage } totalCount } }',
      variables: {
        first: 10,
        filter: {
          account: {
            equalTo: address
          },
          amount: {
            greaterThan: 1000000
          },
          updatedAt: {
            greaterThan: 0
          }
        },
        order: 'AMOUNT_DESC'
      }
    };
  }

  async fetchDelegateState (address: string): Promise<RawDelegateState> {
    return new Promise(function (resolve) {
      fetch('https://api.subquery.network/sq/TaoStats/bittensor-indexer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(TaoNativeStakingPoolHandler.parseDelegateState(address))
      }).then((resp) => {
        resolve(resp.json());
      }).catch(console.error);
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getSingleStakingTao (substrateApi: _SubstrateApi, useAddress: string, chainInfoMap: Record<string, _ChainInfo>, chain: string, stakingCallback: (networkKey: string, rs: StakingItem) => void, nominatorStateCallBack: (nominatorMetadata: NominatorMetadata) => void) {
    const { symbol } = _getChainNativeTokenBasicInfo(chainInfoMap[chain]);
    const owner = reformatAddress(useAddress, 42);

    const _getStakingTaoInterval = async () => {
      if (chain === 'bittensor-testnet') {
        const testnetAddresses = ['5Fjp4r8cvWexkWUVb756LkopTVjmzXHBT4unpDN6SzwmQq8E', '5DG4VHT3gKZDEQ3Tx4oVPpejaz64FeDtNPhbAYTLFBmygHUW'];
        const delegatorState: TaoStakingStakeOption[] = [];
        let bnTotalBalance = BN_ZERO;

        for (const hotkey of testnetAddresses) {
          const _stakeAmount = await substrateApi.api.query.subtensorModule.stake(hotkey, useAddress);
          // @ts-ignore
          const bnStakeAmount = new BN(_stakeAmount);

          bnTotalBalance = bnTotalBalance.add(bnStakeAmount);

          delegatorState.push({
            owner: hotkey,
            amount: bnStakeAmount.toString()
          });
        }

        stakingCallback(chain, {
          name: chainInfoMap[chain].name,
          chain: chain,
          balance: bnTotalBalance.toString(),
          activeBalance: bnTotalBalance.toString(),
          unlockingBalance: '0',
          nativeToken: symbol,
          unit: symbol,
          state: APIItemState.READY,
          type: StakingType.NOMINATED,
          address: owner
        } as StakingItem);

        const nominatorMetadata = await this.parseNominatorMetadata(chainInfoMap[chain], useAddress, delegatorState);

        nominatorStateCallBack(nominatorMetadata);
      }
    };

    _getStakingTaoInterval().catch(console.error);

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    return setInterval(_getStakingTaoInterval, BITTENSOR_REFRESH_STAKE_INFO);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getMultiStakingTao (useAddresses: string[], chainInfoMap: Record<string, _ChainInfo>, chain: string, stakingCallback: (networkKey: string, rs: StakingItem) => void, nominatorStateCallback: (nominatorMetadata: NominatorMetadata) => void) {
    const _getStakingTaoInterval = async () => {
      const rawDelegateStateInfos = await Promise.all(useAddresses.map((address) => {
        return this.fetchDelegateState(address);
      }));

      if (rawDelegateStateInfos.length > 0) {
        const { symbol } = _getChainNativeTokenBasicInfo(chainInfoMap[chain]);

        // eslint-disable-next-line array-callback-return
        rawDelegateStateInfos.map(async (rawDelegateStateInfo, i) => {
          const owner = reformatAddress(useAddresses[i], 42);
          const delegatorState: TaoStakingStakeOption[] = [];
          let bnTotalBalance = BN_ZERO;
          const delegateStateInfo = rawDelegateStateInfo?.data?.delegateBalances?.nodes;

          for (const delegate of delegateStateInfo) {
            bnTotalBalance = bnTotalBalance.add(new BN(delegate.amount));
            delegatorState.push({
              owner: delegate.delegate,
              amount: delegate.amount.toString()
            });
          }

          stakingCallback(chain, {
            name: chainInfoMap[chain].name,
            chain: chain,
            balance: bnTotalBalance.toString(),
            activeBalance: bnTotalBalance.toString(),
            unlockingBalance: '0',
            nativeToken: symbol,
            unit: symbol,
            state: APIItemState.READY,
            type: StakingType.NOMINATED,
            address: owner
          } as StakingItem);
          const nominatorMetadata = await this.parseNominatorMetadata(chainInfoMap[chain], owner, delegatorState);

          nominatorStateCallback(nominatorMetadata);
        });
      }
    };

    function getStakingTaoInterval () {
      _getStakingTaoInterval().catch(console.error);
    }

    getStakingTaoInterval();
    const interval = setInterval(getStakingTaoInterval, BITTENSOR_REFRESH_STAKE_INFO);

    return () => {
      clearInterval(interval);
    };
  }

  async getTaoStakingOnChain (parentApi: _SubstrateApi, useAddresses: string[], networks: Record<string, _ChainInfo>, chain: string, callback: (networkKey: string, rs: StakingItem) => void, nominatorStateCallBack: (nominatorMetadata: NominatorMetadata) => void) {
    if (useAddresses.length === 1) {
      return this.getSingleStakingTao(parentApi, useAddresses[0], networks, chain, callback, nominatorStateCallBack);
    }

    return this.getMultiStakingTao(useAddresses, networks, chain, callback, nominatorStateCallBack);
  }
}
