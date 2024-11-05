// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import { fetchStaticData } from '@subwallet/extension-base/utils';

interface BlockedActionsFeaturesMap {
  blockedActionsMap: Record<ExtrinsicType, string[]>
  blockedFeaturesList: string[],
}

export const fetchLastestBlockedActionsAndFeatures = async () => {
  return await fetchStaticData<BlockedActionsFeaturesMap>('blocked-actions-features');
};
