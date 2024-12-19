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

export function sortToken (tokenGroupSlug: TokenBalanceItemType[], popularTokens: Record<string, number>) {
  return tokenGroupSlug.sort((a, b) => {
    const aIsPiorityToken = Object.keys(popularTokens).includes(a.slug);
    const bIsPiorityToken = Object.keys(popularTokens).includes(b.slug);
    const aPiority = popularTokens[a.slug];
    const bPiority = popularTokens[b.slug];

    if (aIsPiorityToken && !bIsPiorityToken) {
      return -1;
    } else if (!aIsPiorityToken && bIsPiorityToken) {
      return 1;
    } else if (!aIsPiorityToken && !bIsPiorityToken) {
      return sortTokenByValue(a, b);
    } else {
      if (aPiority < bPiority) {
        return -1;
      } else {
        return 1;
      }
    }
  });
}
