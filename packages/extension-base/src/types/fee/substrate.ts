// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { BaseFeeDetail, BaseFeeInfo } from './base';
import { FeeDefaultOption } from './option';

export interface SubstrateTipInfo {
  tip: string;
}

export interface SubstrateFeeInfo extends BaseFeeInfo {
  type: 'substrate';
  options: {
    slow: SubstrateTipInfo;
    average: SubstrateTipInfo;
    fast: SubstrateTipInfo;
    default: FeeDefaultOption;
  }
}

export type SubstrateFeeDetail = SubstrateFeeInfo & BaseFeeDetail;
