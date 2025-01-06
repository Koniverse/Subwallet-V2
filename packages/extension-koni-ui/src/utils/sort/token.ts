// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { PrioritizedTokenList } from '@subwallet/extension-base/background/KoniTypes';
import { BalanceValueInfo } from '@subwallet/extension-koni-ui/types';

export interface TokenAttributes {
  slug: string,
  symbol: string,
  total?: BalanceValueInfo,
  multiChainAsset?: string | null
}

export const sortTokenByValue = (a: TokenAttributes, b: TokenAttributes): number => {
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

export const sortByTokenPopularity = (a: string, b: string, aIsPrioritizedToken: boolean, bIsPrioritizedToken: boolean, aPriority: number, bPriority: number): number => {
  if (aIsPrioritizedToken && !bIsPrioritizedToken) {
    return -1;
  } else if (!aIsPrioritizedToken && bIsPrioritizedToken) {
    return 1;
  } else if (!aIsPrioritizedToken && !bIsPrioritizedToken) {
    return sortTokenAlphabetically(a, b);
  } else {
    if (aPriority < bPriority) {
      return -1;
    } else if (aPriority > bPriority) {
      return 1;
    } else {
      return 0;
    }
  }
};

export function sortToken (tokenGroupSlug: TokenAttributes[], popularTokens: Record<string, PrioritizedTokenList>) {
  return tokenGroupSlug.sort((a, b) => {
    const aBelongtoPrioritizedGroup = a.multiChainAsset ? Object.keys(popularTokens).includes(a.multiChainAsset) : false;
    const bBelongtoPrioritizedGroup = b.multiChainAsset ? Object.keys(popularTokens).includes(b.multiChainAsset) : false;

    const aIsPrioritizedToken = (aBelongtoPrioritizedGroup && a.multiChainAsset && Object.keys(popularTokens[a.multiChainAsset].tokens).includes(a.slug)) || Object.keys(popularTokens).includes(a.slug);
    const bIsPrioritizedToken = (bBelongtoPrioritizedGroup && b.multiChainAsset && Object.keys(popularTokens[b.multiChainAsset].tokens).includes(b.slug)) || Object.keys(popularTokens).includes(b.slug);

    const aHasBalance = (a.total && a.total.convertedValue.toNumber() !== 0) || (a.total && a.total.value.toNumber() !== 0);
    const bHasBalance = (b.total && b.total.convertedValue.toNumber() !== 0) || (b.total && b.total.value.toNumber() !== 0);

    const aPriority = a.multiChainAsset ? aIsPrioritizedToken ? (popularTokens[a.multiChainAsset].tokens)[a.slug] : 0 : aIsPrioritizedToken ? popularTokens[a.slug].priority : 0;
    const bPriority = b.multiChainAsset ? bIsPrioritizedToken ? (popularTokens[b.multiChainAsset].tokens)[b.slug] : 0 : bIsPrioritizedToken ? popularTokens[b.slug].priority : 0;

    if (aHasBalance && bHasBalance) {
      return sortTokenByValue(a, b);
    } else if (aHasBalance && !bHasBalance) {
      return -1;
    } else if (!aHasBalance && bHasBalance) {
      return 1;
    } else {
      return sortByTokenPopularity(a.symbol, b.symbol, aIsPrioritizedToken, bIsPrioritizedToken, aPriority, bPriority);
    }
  });
}
