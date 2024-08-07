// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainAsset } from '@subwallet/chain-list/types';
import { _getMultiChainAsset } from '@subwallet/extension-base/services/chain-service/utils';
import { RECEIVE_MODAL_ACCOUNT_SELECTOR, RECEIVE_MODAL_TOKEN_SELECTOR } from '@subwallet/extension-koni-ui/constants';
import { useChainAssets } from '@subwallet/extension-koni-ui/hooks/assets';
import { AccountAddressItemType, ReceiveModalProps } from '@subwallet/extension-koni-ui/types';
import { ModalContext } from '@subwallet/react-ui';
import { useCallback, useContext, useMemo } from 'react';

type HookType = {
  onOpenReceive: VoidFunction;
  receiveModalProps: ReceiveModalProps;
};

const tokenSelectorModalId = RECEIVE_MODAL_TOKEN_SELECTOR;
const accountSelectorModalId = RECEIVE_MODAL_ACCOUNT_SELECTOR;

export default function useReceiveModalHelper (tokenGroupSlug?: string): HookType {
  const { activeModal, inactiveModal } = useContext(ModalContext);
  const chainAssets = useChainAssets().chainAssets;

  const onOpenReceive = useCallback(() => {
    activeModal(tokenSelectorModalId);
  }, [activeModal]);

  /* --- token Selector */

  const tokenSelectorItems = useMemo<_ChainAsset[]>(() => {
    if (tokenGroupSlug) {
      return chainAssets.filter((asset) => _getMultiChainAsset(asset) === tokenGroupSlug);
    }

    return chainAssets;
  }, [chainAssets, tokenGroupSlug]);

  const onCloseTokenSelector = useCallback(() => {
    inactiveModal(tokenSelectorModalId);
  }, [inactiveModal]);

  const onSelectTokenSelector = useCallback((item: _ChainAsset) => {
    //
  }, []);

  /* token Selector --- */

  /* --- account Selector */

  const accountSelectorItems = useMemo<AccountAddressItemType[]>(() => {
    return [];
  }, []);

  const onBackAccountSelector = useCallback(() => {
    inactiveModal(accountSelectorModalId);
  }, [inactiveModal]);

  const onCloseAccountSelector = useCallback(() => {
    inactiveModal(accountSelectorModalId);
  }, [inactiveModal]);

  const onSelectAccountSelector = useCallback((item: AccountAddressItemType) => {
    //
  }, []);

  /* account Selector --- */

  return useMemo(() => ({
    onOpenReceive,
    receiveModalProps: {
      onSelectToken: () => {
        //
      },
      tokenSelectorItems,
      onCloseTokenSelector,
      onSelectTokenSelector,
      accountSelectorItems,
      onBackAccountSelector,
      onCloseAccountSelector,
      onSelectAccountSelector
    }
  }), [accountSelectorItems, onBackAccountSelector, onCloseAccountSelector,
    onCloseTokenSelector, onOpenReceive, onSelectAccountSelector,
    onSelectTokenSelector, tokenSelectorItems]);
}
