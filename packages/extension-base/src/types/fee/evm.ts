// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { BaseFeeDetail, BaseFeeInfo, FeeDefaultOption } from '@subwallet/extension-base/types';

export interface EvmLegacyFeeInfo extends BaseFeeInfo {
  type: 'evm';
  gasPrice: string;
  baseGasFee: undefined;
  options: undefined;
}

export interface EvmEIP1559FeeOption {
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
}

export interface EvmEIP1559FeeInfo extends BaseFeeInfo {
  type: 'evm';
  gasPrice: undefined;
  baseGasFee: string;
  options: {
    slow: EvmEIP1559FeeOption;
    average: EvmEIP1559FeeOption;
    fast: EvmEIP1559FeeOption;
    default: FeeDefaultOption;
  }
}

export type EvmFeeInfo = EvmLegacyFeeInfo | EvmEIP1559FeeInfo;

export interface EvmLegacyFeeInfoCache extends BaseFeeInfo {
  gasPrice: string;
  maxFeePerGas: undefined;
  maxPriorityFeePerGas: undefined;
  baseGasFee: undefined;
}

export interface EvmEIP1559FeeInfoCache extends BaseFeeInfo {
  gasPrice: undefined;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  baseGasFee: string;
}

export interface EvmLegacyFeeDetail extends EvmLegacyFeeInfo, BaseFeeDetail {
  gasLimit: string;
}

export interface EvmEIP1559FeeDetail extends EvmEIP1559FeeInfo, BaseFeeDetail {
  gasLimit: string;
}

export type EvmFeeInfoCache = EvmLegacyFeeInfoCache | EvmEIP1559FeeInfoCache;

export type EvmFeeDetail = EvmLegacyFeeDetail | EvmEIP1559FeeDetail;

export interface InfuraFeeDetail {
  suggestedMaxPriorityFeePerGas: string;
  suggestedMaxFeePerGas: string;
  minWaitTimeEstimate: number;
  maxWaitTimeEstimate: number;
}

export interface InfuraFeeInfo {
  low: InfuraFeeDetail;
  medium: InfuraFeeDetail;
  high: InfuraFeeDetail;
  networkCongestion: number;
  estimatedBaseFee: string;
  latestPriorityFeeRange: [string, string],
  historicalPriorityFeeRange: [string, string],
  historicalBaseFeeRange: [string, string],
  priorityFeeTrend: 'down' | 'up';
  baseFeeTrend: 'down' | 'up';
}

export interface InfuraThresholdInfo {
  busyThreshold: string; // in gwei
}
