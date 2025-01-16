// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { TokenPriorityDetails } from '@subwallet/extension-base/background/KoniTypes';
import { BalanceValueInfo } from '@subwallet/extension-koni-ui/types';

export interface SortableTokenItem {
  slug: string,
  symbol: string,
  total?: BalanceValueInfo,
  multiChainAsset?: string | null
}

export const sortTokenByValue = (a: SortableTokenItem, b: SortableTokenItem): number => {
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

export const sortTokenByPriority = (a: string, b: string, aIsPrioritizedToken: boolean, bIsPrioritizedToken: boolean, aPriority: number, bPriority: number): number => {
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

export function sortTokensByStandard (targetTokens: SortableTokenItem[], priorityTokenGroups: Record<string, TokenPriorityDetails>, useTokenPriority?: boolean) {
  const priorityTokenGroupKeys = Object.keys(priorityTokenGroups);

  targetTokens.sort((a, b) => {
    const aHasBalance = (a.total && (a.total.convertedValue.toNumber() !== 0 || a.total.value.toNumber() !== 0));
    const bHasBalance = (b.total && (b.total.convertedValue.toNumber() !== 0 || b.total.value.toNumber() !== 0));

    if (aHasBalance && bHasBalance) {
      return sortTokenByValue(a, b);
    } else if (aHasBalance && !bHasBalance) {
      return -1;
    } else if (!aHasBalance && bHasBalance) {
      return 1;
    }

    const aMultiChainAsset = a.multiChainAsset;
    const bMultiChainAsset = b.multiChainAsset;

    const aSlug = a.slug;
    const bSlug = b.slug;

    const aBelongToPrioritizedGroup = aMultiChainAsset ? priorityTokenGroupKeys.includes(aMultiChainAsset) : false;
    const bBelongToPrioritizedGroup = bMultiChainAsset ? priorityTokenGroupKeys.includes(bMultiChainAsset) : false;

    const aIsPrioritizedToken = !!(aBelongToPrioritizedGroup && aMultiChainAsset && priorityTokenGroups[aMultiChainAsset].priorityTokens[aSlug]) || priorityTokenGroupKeys.includes(aSlug);
    const bIsPrioritizedToken = !!(bBelongToPrioritizedGroup && bMultiChainAsset && priorityTokenGroups[bMultiChainAsset].priorityTokens[bSlug]) || priorityTokenGroupKeys.includes(bSlug);

    let aPriority: number;
    let bPriority: number;

    if (useTokenPriority) {
      aPriority = aMultiChainAsset ? (aIsPrioritizedToken ? priorityTokenGroups[aMultiChainAsset].priorityTokens[aSlug] : 0) : (aIsPrioritizedToken ? priorityTokenGroups[aSlug].priorityTokens[aSlug] : 0);
      bPriority = bMultiChainAsset ? (bIsPrioritizedToken ? priorityTokenGroups[bMultiChainAsset].priorityTokens[bSlug] : 0) : (bIsPrioritizedToken ? priorityTokenGroups[bSlug].priorityTokens[bSlug] : 0);
    } else {
      aPriority = aMultiChainAsset ? (aIsPrioritizedToken ? priorityTokenGroups[aMultiChainAsset].groupPriority : 0) : (aIsPrioritizedToken ? priorityTokenGroups[aSlug].groupPriority : 0);
      bPriority = bMultiChainAsset ? (bIsPrioritizedToken ? priorityTokenGroups[bMultiChainAsset].groupPriority : 0) : (bIsPrioritizedToken ? priorityTokenGroups[bSlug].groupPriority : 0);
    }

    return sortTokenByPriority(a.symbol, b.symbol, aIsPrioritizedToken, bIsPrioritizedToken, aPriority, bPriority);
  });
}
