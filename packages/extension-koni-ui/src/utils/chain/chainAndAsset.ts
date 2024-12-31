// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainAsset, _ChainInfo } from '@subwallet/chain-list/types';
import { AssetSetting } from '@subwallet/extension-base/background/KoniTypes';
import { _ChainState } from '@subwallet/extension-base/services/chain-service/types';
import { _getOriginChainOfAsset, _isAssetFungibleToken } from '@subwallet/extension-base/services/chain-service/utils';
import { AccountChainType } from '@subwallet/extension-base/types';
import { isChainCompatibleWithAccountChainTypes } from '@subwallet/extension-koni-ui/utils';

export function isTokenAvailable (
  chainAsset: _ChainAsset,
  assetSettingMap: Record<string, AssetSetting>,
  chainStateMap: Record<string, _ChainState>,
  filterActiveChain: boolean,
  ledgerNetwork?: string
): boolean {
  const assetSetting = assetSettingMap[chainAsset.slug];

  const isAssetVisible = assetSetting && assetSetting.visible;
  const isAssetFungible = _isAssetFungibleToken(chainAsset);
  const isOriginChainActive = chainStateMap[chainAsset.originChain]?.active;
  const isValidLedger = ledgerNetwork ? ledgerNetwork === chainAsset.originChain : true; // Check if have ledger network

  if (filterActiveChain) {
    return isAssetVisible && isAssetFungible && isOriginChainActive && isValidLedger;
  }

  return isAssetVisible && isAssetFungible && isValidLedger;
}

export function getChainInfoFromToken (tokenSlug: string, chainInfoMap: Record<string, _ChainInfo>): _ChainInfo | undefined {
  const chainSlug = _getOriginChainOfAsset(tokenSlug);

  return chainInfoMap[chainSlug];
}

export function isTokenCompatibleWithAccountChainTypes (
  tokenSlug: string,
  chainTypes: AccountChainType[],
  chainInfoMap: Record<string, _ChainInfo>): boolean {
  const chainInfo = getChainInfoFromToken(tokenSlug, chainInfoMap);

  return !!chainInfo && isChainCompatibleWithAccountChainTypes(chainInfo, chainTypes);
}
