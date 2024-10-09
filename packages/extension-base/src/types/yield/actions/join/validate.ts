// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { YieldValidationStatus } from '../../../transaction';
import { OptimalYieldPath, YieldStepDetail } from './step';
import { SubmitYieldJoinData } from './submit';

export interface YieldProcessValidation {
  ok: boolean,
  status: YieldValidationStatus,
  failedStep?: YieldStepDetail,
  message?: string
}

export interface ValidateYieldProcessParams {
  path: OptimalYieldPath;
  data: SubmitYieldJoinData;
}
