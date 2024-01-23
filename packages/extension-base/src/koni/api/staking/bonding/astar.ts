// Copyright 2019-2022 @subwallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainInfo } from '@subwallet/chain-list/types';
import { ChainStakingMetadata, NominationInfo, NominatorMetadata, StakingStatus, StakingType, UnstakingInfo, UnstakingStatus, ValidatorInfo } from '@subwallet/extension-base/background/KoniTypes';
import { getStakingStatusByNominations, PalletDappsStakingAccountLedger, PalletDappsStakingDappInfo, PalletDappStakingAccountLedger } from '@subwallet/extension-base/koni/api/staking/bonding/utils';
import { _EXPECTED_BLOCK_TIME, _STAKING_ERA_LENGTH_MAP } from '@subwallet/extension-base/services/chain-service/constants';
import { _SubstrateApi } from '@subwallet/extension-base/services/chain-service/types';
import { isUrl, parseRawNumber } from '@subwallet/extension-base/utils';
import fetch from 'cross-fetch';

import { SubmittableExtrinsic } from '@polkadot/api/promise/types';
import { BN, BN_ZERO } from '@polkadot/util';
import { isEthereumAddress } from '@polkadot/util-crypto';

interface CurrentEraInfo {
  totalLocked: string,
  unlocking: string,
  currentStakeAmount: StakeInfo,
  nextStakeAmount: StakeInfo
}

interface StakeInfo {
  voting: string,
  buildAndEarn: string,
  era: number,
  period: number
}

const convertAddress = (address: string) => {
  return isEthereumAddress(address) ? address.toLowerCase() : address;
};

const fetchDApps = async (network: string) => {
  return new Promise(function (resolve) {
    fetch(`https://api.astar.network/api/v1/${network}/dapps-staking/dappssimple`, {
      method: 'GET'
    }).then((resp) => {
      resolve(resp.json());
    }).catch(console.error);
  });
};

export function getAstarWithdrawable (nominatorMetadata: NominatorMetadata): UnstakingInfo {
  const unstakingInfo: UnstakingInfo = {
    chain: nominatorMetadata.chain,
    status: UnstakingStatus.CLAIMABLE,
    claimable: '0',
    waitingTime: 0
  };

  let bnWithdrawable = BN_ZERO;

  for (const unstaking of nominatorMetadata.unstakings) {
    if (unstaking.status === UnstakingStatus.CLAIMABLE) {
      bnWithdrawable = bnWithdrawable.add(new BN(unstaking.claimable));
    }
  }

  unstakingInfo.claimable = bnWithdrawable.toString();

  return unstakingInfo;
}

export function subscribeAstarStakingMetadata (chain: string, substrateApi: _SubstrateApi, callback: (chain: string, rs: ChainStakingMetadata) => void) { // TODO: NEED CHECK era time
  return substrateApi.api.query.dappStaking.currentEraInfo((_currentEra: CurrentEraInfo) => {
    const era = _currentEra.currentStakeAmount.era.toString();
    const minDelegatorStake = substrateApi.api.consts.dappStaking.minimumStakeAmount.toString();
    const unstakingDelay = substrateApi.api.consts.dappStaking.unlockingPeriod.toString();

    const unstakingPeriod = parseInt(unstakingDelay) * _STAKING_ERA_LENGTH_MAP[chain];

    callback(chain, {
      chain,
      type: StakingType.NOMINATED,
      era: parseInt(era),
      minStake: minDelegatorStake,
      maxValidatorPerNominator: 100, // temporary fix for Astar, there's no limit for now
      maxWithdrawalRequestPerValidator: 1, // by default
      allowCancelUnstaking: false,
      unstakingPeriod
    });
  });
}

export async function getAstarStakingMetadata (chain: string, substrateApi: _SubstrateApi): Promise<ChainStakingMetadata> { // TODO: NEED CHECK era time, check APY
  const aprPromise = new Promise(function (resolve) {
    fetch(`https://api.astar.network/api/v1/${chain}/dapps-staking/apr`, {
      method: 'GET'
    }).then((resp) => {
      resolve(resp.json());
    }).catch(console.error);
  });

  const timeout = new Promise((resolve) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      resolve(null);
    }, 8000);
  });

  const aprRacePromise = Promise.race([
    timeout,
    aprPromise
  ]); // need race because API often timeout

  const [aprInfo, chainApi] = await Promise.all([
    aprRacePromise,
    substrateApi.isReady
  ]);

  console.log(aprInfo);
  const eraInfo = await chainApi.api.query.dappStaking.currentEra() as unknown as CurrentEraInfo;
  const era = eraInfo.currentStakeAmount.era.toString();
  const minDelegatorStake = substrateApi.api.consts.dappStaking.minimumStakeAmount.toString();
  const unstakingDelay = substrateApi.api.consts.dappStaking.unlockingPeriod.toString();

  const unstakingPeriod = parseInt(unstakingDelay) * _STAKING_ERA_LENGTH_MAP[chain];

  return {
    chain,
    type: StakingType.NOMINATED,
    expectedReturn: aprInfo !== null ? aprInfo as number : undefined,
    era: parseInt(era),
    minStake: minDelegatorStake,
    maxValidatorPerNominator: 100, // temporary fix for Astar, there's no limit for now
    maxWithdrawalRequestPerValidator: 1, // by default
    allowCancelUnstaking: false, // TODO: need to check
    unstakingPeriod
  } as ChainStakingMetadata;
}

export async function subscribeAstarNominatorMetadata (chainInfo: _ChainInfo, address: string, substrateApi: _SubstrateApi, ledger: PalletDappStakingAccountLedger) {
  const nominationList: NominationInfo[] = [];
  const unstakingList: UnstakingInfo[] = [];

  const allDappsReq = fetchDApps(chainInfo.slug);

  const [_allDapps, _currentBlockNumber, _stakerInfo] = await Promise.all([
    allDappsReq,
    substrateApi.api.query.system.number(),
    substrateApi.api.query.dappStaking.stakerInfo.entries(address)
  ]);

  const blockNumber = parseInt(_currentBlockNumber.toString());
  const minDelegatorStake = substrateApi.api.consts.dappStaking.minimumStakeAmount.toString();

  const allDapps = _allDapps as PalletDappsStakingDappInfo[];

  let bnTotalActiveStake = BN_ZERO;

  if (_stakerInfo.length > 0) {
    const dAppInfoMap: Record<string, PalletDappsStakingDappInfo> = {};

    allDapps.forEach((dappInfo) => {
      dAppInfoMap[convertAddress(dappInfo.address)] = dappInfo;
    });

    for (const item of _stakerInfo) {
      const data = item[0].toHuman() as unknown as any[];
      const stakedDapp = data[1] as Record<string, string>;
      const stakeData = item[1].toPrimitive() as unknown as Record<string, Record<string, StakeInfo>>;
      const stakeInfo = stakeData.staked;

      const voting = new BN(stakeInfo?.voting?.toString() || '0');
      const buildAndEarn = new BN(stakeInfo?.buildAndEarn?.toString() || '0');
      const bnCurrentStake = voting.add(buildAndEarn) || BN_ZERO;

      const _dappAddress = stakedDapp.Evm ? stakedDapp.Evm.toLowerCase() : stakedDapp.Wasm;
      const dappAddress = convertAddress(_dappAddress);

      if (bnCurrentStake.gte(new BN(minDelegatorStake))) { // [info] current stake now only can be 0 or gte minDelegatorStake
        const dappStakingStatus = bnCurrentStake.gt(BN_ZERO) && bnCurrentStake.gte(new BN(minDelegatorStake)) ? StakingStatus.EARNING_REWARD : StakingStatus.NOT_EARNING;

        bnTotalActiveStake = bnTotalActiveStake.add(bnCurrentStake);
        const dappInfo = dAppInfoMap[dappAddress];

        nominationList.push({
          status: dappStakingStatus,
          chain: chainInfo.slug,
          validatorAddress: dappAddress,
          activeStake: bnCurrentStake.toString(),
          validatorMinStake: '0',
          validatorIdentity: dappInfo?.name,
          hasUnstaking: false // cannot get unstaking info by dapp
        });
      }
    }
  }

  const unlockingChunks = ledger.unlocking;

  if (unlockingChunks.length > 0) {
    for (const unlockingChunk of unlockingChunks) {
      const isClaimable = unlockingChunk.unlockBlock - blockNumber <= 0;
      const remainingBlock = unlockingChunk.unlockBlock - blockNumber;
      const waitingTime = remainingBlock * _EXPECTED_BLOCK_TIME[chainInfo.slug] / 60 / 60;

      unstakingList.push({
        chain: chainInfo.slug,
        status: isClaimable ? UnstakingStatus.CLAIMABLE : UnstakingStatus.UNLOCKING,
        claimable: unlockingChunk.amount.toString(),
        waitingTime
      });
    }
  }

  if (nominationList.length === 0 && unstakingList.length === 0) {
    return {
      chain: chainInfo.slug,
      type: StakingType.NOMINATED,
      address,
      status: StakingStatus.NOT_STAKING,
      activeStake: '0',
      nominations: [],
      unstakings: []
    } as NominatorMetadata;
  }

  const stakingStatus = getStakingStatusByNominations(bnTotalActiveStake, nominationList);

  return {
    chain: chainInfo.slug,
    type: StakingType.NOMINATED,
    address: address,
    activeStake: bnTotalActiveStake.toString(),
    nominations: nominationList,
    unstakings: unstakingList,
    status: stakingStatus
  } as NominatorMetadata;
}

/**
 * Deprecated
 * */
export async function getAstarNominatorMetadata (chainInfo: _ChainInfo, address: string, substrateApi: _SubstrateApi): Promise<NominatorMetadata | undefined> { // DELETE
  if (isEthereumAddress(address)) {
    return;
  }

  const chain = chainInfo.slug;
  const chainApi = await substrateApi.isReady;

  const nominationList: NominationInfo[] = [];
  const unstakingList: UnstakingInfo[] = [];

  const allDappsReq = fetchDApps(chain);

  const [_ledger, _era, _stakerInfo] = await Promise.all([
    chainApi.api.query.dappsStaking.ledger(address),
    chainApi.api.query.dappsStaking.currentEra(),
    chainApi.api.query.dappsStaking.generalStakerInfo.entries(address)
  ]);

  const ledger = _ledger.toPrimitive() as unknown as PalletDappsStakingAccountLedger;
  const currentEra = _era.toString();
  const minDelegatorStake = chainApi.api.consts.dappsStaking.minimumStakingAmount.toString();

  let bnTotalActiveStake = BN_ZERO;

  if (_stakerInfo.length > 0) {
    const dAppInfoMap: Record<string, PalletDappsStakingDappInfo> = {};
    const allDapps = await allDappsReq as PalletDappsStakingDappInfo[];

    allDapps.forEach((dappInfo) => {
      const address = isEthereumAddress(dappInfo.address) ? dappInfo.address.toLowerCase() : dappInfo.address;

      dAppInfoMap[address] = dappInfo;
    });

    for (const item of _stakerInfo) {
      const data = item[0].toHuman() as unknown as any[];
      const stakedDapp = data[1] as Record<string, string>;
      const stakeData = item[1].toPrimitive() as Record<string, Record<string, string>[]>;
      const stakeList = stakeData.stakes;

      const dappAddress = convertAddress(stakedDapp.Evm);
      const currentStake = stakeList.slice(-1)[0].staked.toString() || '0';

      const bnCurrentStake = new BN(currentStake);

      if (bnCurrentStake.gt(BN_ZERO)) {
        const dappStakingStatus = bnCurrentStake.gt(BN_ZERO) && bnCurrentStake.gte(new BN(minDelegatorStake)) ? StakingStatus.EARNING_REWARD : StakingStatus.NOT_EARNING;

        bnTotalActiveStake = bnTotalActiveStake.add(bnCurrentStake);
        const dappInfo = dAppInfoMap[dappAddress];

        nominationList.push({
          status: dappStakingStatus,
          chain,
          validatorAddress: dappAddress,
          activeStake: currentStake,
          validatorMinStake: '0',
          validatorIdentity: dappInfo?.name,
          hasUnstaking: false // cannot get unstaking info by dapp
        });
      }
    }
  }

  const unlockingChunks = ledger.unbondingInfo.unlockingChunks;

  if (unlockingChunks.length > 0) {
    for (const unlockingChunk of unlockingChunks) {
      const isClaimable = unlockingChunk.unlockEra - parseInt(currentEra) < 0;
      const remainingEra = unlockingChunk.unlockEra - parseInt(currentEra);
      const waitingTime = remainingEra * _STAKING_ERA_LENGTH_MAP[chain];

      unstakingList.push({
        chain,
        status: isClaimable ? UnstakingStatus.CLAIMABLE : UnstakingStatus.UNLOCKING,
        claimable: unlockingChunk.amount.toString(),
        waitingTime
      });
    }
  }

  if (nominationList.length === 0 && unstakingList.length === 0) {
    return {
      chain: chainInfo.slug,
      type: StakingType.NOMINATED,
      address,
      status: StakingStatus.NOT_STAKING,
      activeStake: '0',
      nominations: [],
      unstakings: []
    } as NominatorMetadata;
  }

  const stakingStatus = getStakingStatusByNominations(bnTotalActiveStake, nominationList);

  return {
    chain,
    type: StakingType.NOMINATED,
    address: address,
    activeStake: bnTotalActiveStake.toString(),
    nominations: nominationList,
    unstakings: unstakingList,
    status: stakingStatus
  } as NominatorMetadata;
}

export async function getAstarDappsInfo (networkKey: string, substrateApi: _SubstrateApi) { // TODO: NEED MODIFY: SOMES ARE DEPRECATED
  const chainApi = await substrateApi.isReady;
  // const rawMaxStakerPerContract = (chainApi.api.consts.dappsStaking.maxNumberOfStakersPerContract).toHuman() as string; // TODO: No limit for now. But need to check maxNumberOfStakersPerContract

  const allDappsInfo: ValidatorInfo[] = [];
  // const maxStakerPerContract = parseRawNumber(rawMaxStakerPerContract);

  const allDappsReq = fetchDApps(networkKey);

  const [_era, _allDapps] = await Promise.all([
    chainApi.api.query.dappStaking.currentEraInfo() as unknown as Promise<CurrentEraInfo>,
    allDappsReq
  ]);

  const era = parseRawNumber(_era.currentStakeAmount.era.toString());
  const allDapps = _allDapps as Record<string, any>[];

  await Promise.all(allDapps.map(async (dapp) => {
    const dappName = dapp.name as string;
    const dappAddress = dapp.address as string;
    const dappIcon = isUrl(dapp.iconUrl as string) ? dapp.iconUrl as string : undefined;
    const contractParam = isEthereumAddress(dappAddress) ? { Evm: dappAddress } : { Wasm: dappAddress };
    const _contractInfo = await chainApi.api.query.dappsStaking.contractEraStake(contractParam, era);
    const contractInfo = _contractInfo.toPrimitive() as Record<string, any>;
    let totalStake = '0';
    let stakerCount = 0;

    if (contractInfo !== null) {
      /** Deprecated */
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
      totalStake = contractInfo?.total?.toString();
      stakerCount = contractInfo.numberOfStakers as number;
    }

    allDappsInfo.push({
      commission: 0,
      expectedReturn: 0,
      address: convertAddress(dappAddress),
      totalStake: totalStake,
      ownStake: '0',
      otherStake: totalStake.toString(),
      nominatorCount: stakerCount,
      blocked: false,
      isVerified: false,
      minBond: '0',
      icon: dappIcon,
      identity: dappName,
      chain: networkKey,
      isCrowded: false // temporary set to false because unlimited
    });
  }));

  return allDappsInfo;
}

// Create extrinsics function

export async function getAstarBondingExtrinsic (substrateApi: _SubstrateApi, amount: string, dappInfo: ValidatorInfo) { // TODO: NEED OPTIMIZE
  // TODO: CHECK  maxNumberOfStakedContract
  const chainApi = await substrateApi.isReady;
  const binaryAmount = new BN(amount);

  const dappParam = isEthereumAddress(dappInfo.address) ? { Evm: dappInfo.address } : { Wasm: dappInfo.address };

  return chainApi.api.tx.utility.batch([
    chainApi.api.tx.dappStaking.lock(binaryAmount),
    chainApi.api.tx.dappStaking.stake(dappParam, binaryAmount)
  ]);
}

export async function getAstarUnbondingExtrinsic (substrateApi: _SubstrateApi, amount: string, dappAddress: string) { // TODO: NEED OPTIMIZE
  // TODO: Check max unlocking chunk
  // TODO: Check remaining lock amount (>5) if unstake. If not, alert will unstake all
  const chainApi = await substrateApi.isReady;
  const binaryAmount = new BN(amount);

  const dappParam = isEthereumAddress(dappAddress) ? { Evm: dappAddress } : { Wasm: dappAddress };

  return chainApi.api.tx.utility.batch([
    chainApi.api.tx.dappStaking.unstake(dappParam, binaryAmount),
    chainApi.api.tx.dappStaking.unlock(binaryAmount)
  ]);
}

export async function getAstarClaimUnlockedExtrinsic (substrateApi: _SubstrateApi) { // TODO: NEED TEST
  const chainApi = await substrateApi.isReady;

  return chainApi.api.tx.dappStaking.claimUnlocked();
}

export async function getAstarClaimRewardExtrinsic (substrateApi: _SubstrateApi, address: string) { // TODO: NEED OPTIMIZE
  //  Get Dapps that the stakers have staked -> Claim bonus reward for each dapp + Claim all staker rewards

  const chainApi = await substrateApi.isReady;

  const _stakedInfo = await chainApi.api.query.dappStaking.stakerInfo.entries(address);

  const allClaimRewardTxs: SubmittableExtrinsic[] = [];

  if (_stakedInfo.length > 0) {
    for (const item of _stakedInfo) {
      // TODO: optimize by check a stake amount in build and earn period/check bonus reward available
      // TODO: handle case no reward to claim
      const addressInfo = item[0].toHuman() as unknown as any[];
      const stakedDapp = addressInfo[1] as Record<string, string>;
      const dappParam = isEthereumAddress(stakedDapp.Evm) ? { Evm: stakedDapp.Evm.toLowerCase() } : { Wasm: stakedDapp.Wasm };

      const claimBonusExtrinsic = chainApi.api.tx.dappStaking.claimBonusReward(dappParam);

      allClaimRewardTxs.push(claimBonusExtrinsic);
    }
  }

  allClaimRewardTxs.push(chainApi.api.tx.dappStaking.claimStakerRewards());

  return chainApi.api.tx.utility.batch(allClaimRewardTxs);
}

// TODO: ADD UnstakeFromUnregistered or not
// export async function getAstarRestakeUnlockingExtrinsic (substrateApi: _SubstrateApi, dappAddress: string, address: string) { // TODO: Decide to restake or relock.
//   const chainApi = await substrateApi.isReady;
//   const dappParam = isEthereumAddress(dappAddress) ? { Evm: dappAddress } : { Wasm: dappAddress };

//   return chainApi.api.tx.utility.batch([
//     chainApi.api.tx.dappStaking.relockUnlocking(),
//     chainApi.api.tx.dappStaking.stake(dappParam, max)
//   ]);
// }
