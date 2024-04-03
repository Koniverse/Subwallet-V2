// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

/**
 * @enum {string}
 * @description The status of un-staked request.
 * */
export enum UnlockingStatus {
  /** Can withdraw value */
  CLAIMABLE = 'CLAIMABLE',
  /** Waiting to unlock value */
  UNLOCKING = 'UNLOCKING'
}

/**
 * @interface UnlockingInfo
 * @description Info of un-lock request
 * @prop {string} chain - Slug of chain
 * @prop {UnlockingStatus} status - Status of request
 * @prop {string} claimable - Amount to be withdrawn
 * @prop {number} [waitingTime] - Time remains to wait (in hours)
 * @prop {string} [validatorAddress] - Address of validator
 * */
export interface UnlockingInfo {
  /** Slug of chain */
  chain: string;
  /** Status of request */
  status: UnlockingStatus;
  /** Amount to be withdrawn */
  claimable: string;
  /** Time remains to wait (in hours) */
  waitingTime?: number;
  /** Timestamp to withdraw */
  targetTimestampMs?: number;
  /** Address of validator */
  validatorAddress?: string;
}
