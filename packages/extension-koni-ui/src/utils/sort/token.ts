// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { PopularGroup } from '@subwallet/extension-base/background/KoniTypes';
import { BalanceValueInfo } from '@subwallet/extension-koni-ui/types';

export interface TokenSort {
  slug: string,
  symbol: string,
  total?: BalanceValueInfo,
  multiChainAsset?: string | null
}

export const sortTokenByValue = (a: TokenSort, b: TokenSort): number => {
  if (a.total && b.total) {
    const convertValue = b.total.convertedValue.minus(a.total.convertedValue).toNumber();

    if (convertValue) {
      return convertValue;
    } else {
      return b.total.value.minus(a.total.value).toNumber();
    }
  } else {
    return 0;
  }
};

export const sortTokenAlphabetically = (a: string, b: string): number => {
  const aSymbol = a.toLowerCase();
  const bSymbol = b.toLowerCase();

  if (aSymbol < bSymbol) {
    return -1;
  } else if (aSymbol > bSymbol) {
    return 1;
  } else {
    return 0;
  }
};

export const sortByTokenPopularity = (a: string, b: string, aIsPiorityToken: boolean, bIsPiorityToken: boolean, aPiority: number, bPiority: number): number => {
  if (aIsPiorityToken && !bIsPiorityToken) {
    return -1;
  } else if (!aIsPiorityToken && bIsPiorityToken) {
    return 1;
  } else if (!aIsPiorityToken && !bIsPiorityToken) {
    return sortTokenAlphabetically(a, b);
  } else {
    if (aPiority < bPiority) {
      return -1;
    } else if (aPiority > bPiority) {
      return 1;
    } else {
      return 0;
    }
  }
};

export function sortToken (tokenGroupSlug: TokenSort[], popularTokens: Record<string, PopularGroup>) {
  return tokenGroupSlug.sort((a, b) => {
    const aBelongtoPiorityGroup = a.multiChainAsset ? Object.keys(popularTokens).includes(a.multiChainAsset) : false;
    const bBelongtoPiorityGroup = b.multiChainAsset ? Object.keys(popularTokens).includes(b.multiChainAsset) : false;

    const aIsPiorityToken = (aBelongtoPiorityGroup && a.multiChainAsset && Object.keys(popularTokens[a.multiChainAsset].tokens).includes(a.slug)) || Object.keys(popularTokens).includes(a.slug);
    const bIsPiorityToken = (bBelongtoPiorityGroup && b.multiChainAsset && Object.keys(popularTokens[b.multiChainAsset].tokens).includes(b.slug)) || Object.keys(popularTokens).includes(b.slug);

    const aHasBalance = (a.total && a.total.convertedValue.toNumber() !== 0) || (a.total && a.total.value.toNumber() !== 0);
    const bHasBalance = (b.total && b.total.convertedValue.toNumber() !== 0) || (b.total && b.total.value.toNumber() !== 0);

    const aPiority = a.multiChainAsset ? aIsPiorityToken ? (popularTokens[a.multiChainAsset].tokens)[a.slug] : 0 : aIsPiorityToken ? popularTokens[a.slug].piority : 0;
    const bPiority = b.multiChainAsset ? bIsPiorityToken ? (popularTokens[b.multiChainAsset].tokens)[b.slug] : 0 : bIsPiorityToken ? popularTokens[b.slug].piority : 0;

    if (aHasBalance && bHasBalance) {
      return sortTokenByValue(a, b);
    } else if (aHasBalance && !bHasBalance) {
      return -1;
    } else if (!aHasBalance && bHasBalance) {
      return 1;
    } else {
      return sortByTokenPopularity(a.symbol, b.symbol, aIsPiorityToken, bIsPiorityToken, aPiority, bPiority);
    }
  });
}
