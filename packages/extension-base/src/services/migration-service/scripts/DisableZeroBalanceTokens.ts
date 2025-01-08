// Copyright 2019-2022 @subwallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AssetSetting, TokenPriorityDetails } from '@subwallet/extension-base/background/KoniTypes';
import { _isNativeToken } from '@subwallet/extension-base/services/chain-service/utils';
import BaseMigrationJob from '@subwallet/extension-base/services/migration-service/Base';
import { fetchStaticData } from '@subwallet/extension-base/utils';

// Usage:
// 1. Disable tokens with a balance of 0, except for the native token and priorityToken.

export default class DisableZeroBalanceTokens extends BaseMigrationJob {
  public override async run (): Promise<void> {
    const state = this.state;

    try {
      const rawBalanceMap = await state.dbService.getStoredBalance();
      const tokensList = await state.chainService.getAssetSettings();
      const filteredEnabledTokens: Record<string, AssetSetting> = Object.entries(tokensList).reduce((acc, [key, value]) => {
        if (value.visible) {
          acc[key] = value;
        }

        return acc;
      }, {} as Record<string, AssetSetting>);

      const balanceNonZero = rawBalanceMap.filter((item) => {
        return (BigInt(item.free) + BigInt(item.locked) > 0);
      });

      const priorityTokensMap = await fetchStaticData<Record<string, TokenPriorityDetails>>('chain-assets/priority-tokens') || [];
      const priorityTokensList = Object.values(priorityTokensMap).flatMap((tokenData) =>
        Object.keys(tokenData.priorityTokens)
      );
      // Extract the slugs of tokens with balance > 0
      const nonZeroBalanceSlugs = new Set(balanceNonZero.map((item) => item.tokenSlug));

      const updatedSettings = structuredClone(filteredEnabledTokens);

      Object.keys(filteredEnabledTokens).forEach((slug) => {
        const originAsset = state.chainService.getAssetBySlug(slug);

        // Check if it is a native token
        const isNativeToken = originAsset && _isNativeToken(originAsset);

        // Check if it is a popular token
        const isPopularToken = priorityTokensList.includes(slug);

        if (!isNativeToken && !isPopularToken && !nonZeroBalanceSlugs.has(slug)) {
          updatedSettings[slug] = {
            visible: false
          };
        }
      });

      state.chainService.setAssetSettings(updatedSettings);
    } catch (error) {
      console.error(error);
    }
  }
}
