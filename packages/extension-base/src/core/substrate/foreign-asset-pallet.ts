// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { _getAssetPalletLockedBalance, _getAssetPalletTransferable, PalletAssetsAssetAccount } from '@subwallet/extension-base/core/substrate/assets-pallet';

export function _getForeignAssetPalletTransferable (accountInfo: PalletAssetsAssetAccount): bigint {
  return _getAssetPalletTransferable(accountInfo);
}

export function _getForeignAssetPalletLockedBalance (accountInfo: PalletAssetsAssetAccount): bigint {
  return _getAssetPalletLockedBalance(accountInfo);
}
