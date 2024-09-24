// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import { fetchStaticData } from '@subwallet/extension-base/utils';

interface BlockedActionsFeaturesMap {
  blockedActionsMap: Record<ExtrinsicType, string[]>
  blockedFeaturesList: string[],
}

const BLOCKED_ACTIONS_AND_FEATURES_PROMISE = fetchStaticData<BlockedActionsFeaturesMap>('blocked-actions-features');

export const fetchLastestBlockedActionsAndFeatures = async () => {
  return await BLOCKED_ACTIONS_AND_FEATURES_PROMISE;
};
