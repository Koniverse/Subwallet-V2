// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { BaseFeeDetail, BaseFeeInfo } from './base';
import { FeeDefaultOption } from './option';

export interface EvmLegacyFeeInfo extends BaseFeeInfo {
  type: 'evm';
  gasPrice: string;
  baseGasFee: undefined;
  options: undefined;
}

export interface EvmEIP1995FeeOption {
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
}

export interface EvmEIP1995FeeInfo extends BaseFeeInfo {
  type: 'evm';
  gasPrice: undefined;
  baseGasFee: string;
  options: {
    slow: EvmEIP1995FeeOption;
    average: EvmEIP1995FeeOption;
    fast: EvmEIP1995FeeOption;
    default: FeeDefaultOption;
  }
}

export type EvmFeeInfo = EvmLegacyFeeInfo | EvmEIP1995FeeInfo;

export interface EvmLegacyFeeDetail extends EvmLegacyFeeInfo, BaseFeeDetail {
  gasLimit: string;
}

export interface EvmEIP1995FeeDetail extends EvmEIP1995FeeInfo, BaseFeeDetail {
  gasLimit: string;
}

export type EvmFeeDetail = EvmLegacyFeeDetail | EvmEIP1995FeeDetail;

export interface InfuraFeeDetail {
  suggestedMaxPriorityFeePerGas: string; // in gwei
  suggestedMaxFeePerGas: string; // in gwei
  minWaitTimeEstimate: number;
  maxWaitTimeEstimate: number;
}

export interface InfuraFeeInfo {
  low: InfuraFeeDetail;
  medium: InfuraFeeDetail;
  high: InfuraFeeDetail;
  networkCongestion: number;
  estimatedBaseFee: string;
  latestPriorityFeeRange: [string, string];
  historicalPriorityFeeRange: [string, string];
  historicalBaseFeeRange: [string, string];
  priorityFeeTrend: 'down' | 'up';
  baseFeeTrend: 'down' | 'up';
}

export interface InfuraThresholdInfo {
  busyThreshold: string; // in gwei
}
