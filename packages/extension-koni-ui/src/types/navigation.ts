// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountAuthType } from '@subwallet/extension-base/background/types';
import { EarningEntryView } from '@subwallet/extension-koni-ui/types/earning';

// token

export type TokenDetailParam = {
  symbol: string,
  tokenGroup?: string,
  tokenSlug?: string,
};

// settings

export type ManageChainsParam = {
  defaultSearch: string,
};

// manage website access

export type ManageWebsiteAccessDetailParam = {
  siteName: string,
  origin: string,
  accountAuthTypes: AccountAuthType[],
};

// transfer

export type SendFundParam = {
  slug: string, // multiChainAsset slug or token slug
}

// buy tokens

export type BuyTokensParam = {
  symbol: string,
};

// earning

export type EarningEntryParam = {
  view: EarningEntryView
};

export type EarningPoolsParam = {
  poolGroup: string,
  symbol: string,
};

export type EarningPositionDetailParam = {
  earningSlug: string
};

// general

export type RemindBackUpSeedPhraseParamState = {
  from: string;
}

// account detail

export type AccountDetailParam = {
  requestViewDerivedAccounts?: boolean
  requestViewDerivedAccountDetails?: boolean
}
