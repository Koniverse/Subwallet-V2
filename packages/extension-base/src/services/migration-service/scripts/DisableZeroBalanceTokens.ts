// Copyright 2019-2022 @subwallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AssetSetting } from '@subwallet/extension-base/background/KoniTypes';
import BaseMigrationJob from '@subwallet/extension-base/services/migration-service/Base';

// Usage:
// 1. Disable tokens with a balance of 0

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

      // Extract the slugs of tokens with balance > 0
      const nonZeroBalanceSlugs = new Set(balanceNonZero.map((item) => item.tokenSlug));

      const updatedSettings = structuredClone(tokensList);

      Object.keys(filteredEnabledTokens).forEach((slug) => {
        if (!nonZeroBalanceSlugs.has(slug)) {
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
