// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainAsset } from '@subwallet/chain-list/types';
import { AccountAddressItemType } from '@subwallet/extension-koni-ui/types/account';

export type ReceiveModalProps = {
  tokenSelectorItems: _ChainAsset[];
  onCloseTokenSelector: VoidFunction;
  onSelectTokenSelector: (item: _ChainAsset) => void;
  accountSelectorItems: AccountAddressItemType[];
  onCloseAccountSelector: VoidFunction;
  onBackAccountSelector?: VoidFunction;
  onSelectAccountSelector: (item: AccountAddressItemType) => void;
}
