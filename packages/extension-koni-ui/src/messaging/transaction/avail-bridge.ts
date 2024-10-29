// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { RequestClaimAvailBridge } from '@subwallet/extension-base/types/avail-bridge';
import { sendMessage } from '@subwallet/extension-koni-ui/messaging';

export async function submitClaimAvailBridge (data: RequestClaimAvailBridge) {
  return sendMessage('pri(availBridge.submitClaimAvailBridgeOnAvail)', data);
}
