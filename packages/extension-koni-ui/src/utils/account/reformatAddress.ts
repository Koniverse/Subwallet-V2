// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { reformatAddress as baseReformatAddress } from '@subwallet/extension-base/utils';

// todo: migrate all usages to the one in extension-base/utils then remove this function
export default function reformatAddress (address: string, networkPrefix = 42, isEthereum = false): string {
  return baseReformatAddress(address, networkPrefix, isEthereum);
}
