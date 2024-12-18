// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { TokenBalanceItemType } from '@subwallet/extension-koni-ui/types';

export const sortTokenByValue = (a: TokenBalanceItemType, b: TokenBalanceItemType): number => {
  const convertValue = b.total.convertedValue.minus(a.total.convertedValue).toNumber();

  if (convertValue) {
    return convertValue;
  } else {
    return b.total.value.minus(a.total.value).toNumber();
  }
};

export function sortToken (tokenGroupSlug: TokenBalanceItemType[], popularTokens: string[]) {
  return tokenGroupSlug.sort((a, b) => {
    const aIsPiorityToken = popularTokens.includes(a.slug);
    const bIsPiorityToken = popularTokens.includes(b.slug);

    if (aIsPiorityToken && !bIsPiorityToken) {
      return -1;
    } else if (!aIsPiorityToken && bIsPiorityToken) {
      return 1;
    } else if (!aIsPiorityToken && !bIsPiorityToken) {
      return sortTokenByValue(a, b);
    } else {
      return 0;
    }
  });
}
