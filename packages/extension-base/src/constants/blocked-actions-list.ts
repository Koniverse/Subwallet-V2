// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { fetchStaticData } from '@subwallet/extension-base/utils';

interface BlockedActionsList {
  blockedList: string[]
}

const BLOCKED_ACTIONS_LIST_PROMISE = fetchStaticData<Record<string, number[]>>('blocked-actions-list');

export const fetchLastestBlockedActionsList = async () => {
  const _blockedActionsList = await BLOCKED_ACTIONS_LIST_PROMISE as unknown as BlockedActionsList;

  return _blockedActionsList.blockedList;
};
