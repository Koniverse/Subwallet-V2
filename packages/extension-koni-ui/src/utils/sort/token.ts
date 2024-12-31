// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainAsset } from '@subwallet/chain-list/types';
import { PopularGroup } from '@subwallet/extension-base/background/KoniTypes';
import { TokenBalanceItemType } from '@subwallet/extension-koni-ui/types';

export const sortTokenByValue = (a: TokenBalanceItemType, b: TokenBalanceItemType): number => {
  const convertValue = b.total.convertedValue.minus(a.total.convertedValue).toNumber();

  if (convertValue) {
    return convertValue;
  } else {
    return b.total.value.minus(a.total.value).toNumber();
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

export const sortTokenByPopularity = (a: string, b: string, aIsPiorityToken: boolean, bIsPiorityToken: boolean, aPiority: number, bPiority: number): number => {
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

export function sortToken (tokenGroupSlug: TokenBalanceItemType[], popularTokens: Record<string, PopularGroup>) {
  return tokenGroupSlug.sort((a, b) => {
    const aIsPiorityGroup = Object.keys(popularTokens).includes(a.slug);
    const bIsPiorityGroup = Object.keys(popularTokens).includes(b.slug);
    const aPiority = aIsPiorityGroup ? popularTokens[a.slug].piority : 0;
    const bPiority = bIsPiorityGroup ? popularTokens[b.slug].piority : 0;

    const aHasBalance = a.total.convertedValue.toNumber() !== 0 || a.total.value.toNumber() !== 0;
    const bHasBalance = b.total.convertedValue.toNumber() !== 0 || b.total.value.toNumber() !== 0;

    if (aHasBalance && bHasBalance) {
      return sortTokenByValue(a, b);
    } else if (aHasBalance && !bHasBalance) {
      return -1;
    } else if (!aHasBalance && bHasBalance) {
      return 1;
    } else {
      return sortTokenByPopularity(a.symbol, b.symbol, aIsPiorityGroup, bIsPiorityGroup, aPiority, bPiority);
    }
  });
}

export function sortTokenInGetAddressScreen (tokenGroupSlug: _ChainAsset[], popularTokens: Record<string, PopularGroup>) {
  return tokenGroupSlug.sort((a, b) => {
    const aBelongtoPiorityGroup = a.multiChainAsset ? Object.keys(popularTokens).includes(a.multiChainAsset) : false;
    const bBelongtoPiorityGroup = b.multiChainAsset ? Object.keys(popularTokens).includes(b.multiChainAsset) : false;

    const aIsPiorityToken = (aBelongtoPiorityGroup && a.multiChainAsset && Object.keys(popularTokens[a.multiChainAsset].tokens).includes(a.slug)) || Object.keys(popularTokens).includes(a.slug);
    const bIsPiorityToken = (bBelongtoPiorityGroup && b.multiChainAsset && Object.keys(popularTokens[b.multiChainAsset].tokens).includes(b.slug)) || Object.keys(popularTokens).includes(b.slug);

    const aPiority = a.multiChainAsset ? aIsPiorityToken ? (popularTokens[a.multiChainAsset].tokens)[a.slug] : 0 : aIsPiorityToken ? popularTokens[a.slug].piority : 0;
    const bPiority = b.multiChainAsset ? bIsPiorityToken ? (popularTokens[b.multiChainAsset].tokens)[b.slug] : 0 : bIsPiorityToken ? popularTokens[b.slug].piority : 0;

    return sortTokenByPopularity(a.symbol, b.symbol, aIsPiorityToken, bIsPiorityToken, aPiority, bPiority);
  });
}
