// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { KeypairType } from '@subwallet/keyring/types';

import { _ChainAsset } from '@subwallet/chain-list/types';
import { _getAssetOriginChain, _getMultiChainAsset } from '@subwallet/extension-base/services/chain-service/utils';
import { TON_CHAINS } from '@subwallet/extension-base/services/earning-service/constants';
import { RECEIVE_MODAL_ACCOUNT_SELECTOR, RECEIVE_MODAL_TOKEN_SELECTOR } from '@subwallet/extension-koni-ui/constants';
import { WalletModalContext } from '@subwallet/extension-koni-ui/contexts/WalletModalContextProvider';
import { useGetChainSlugsByAccount, useHandleTonAccountWarning } from '@subwallet/extension-koni-ui/hooks';
import { useChainAssets } from '@subwallet/extension-koni-ui/hooks/assets';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import { AccountAddressItemType, ReceiveModalProps } from '@subwallet/extension-koni-ui/types';
import { getReformatedAddressRelatedToChain } from '@subwallet/extension-koni-ui/utils';
import { ModalContext } from '@subwallet/react-ui';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

type HookType = {
  onOpenReceive: VoidFunction;
  receiveModalProps: ReceiveModalProps;
};

const tokenSelectorModalId = RECEIVE_MODAL_TOKEN_SELECTOR;
const accountSelectorModalId = RECEIVE_MODAL_ACCOUNT_SELECTOR;

export default function useCoreReceiveModalHelper (tokenGroupSlug?: string): HookType {
  const { activeModal, inactiveModal } = useContext(ModalContext);
  const { chainAssets } = useChainAssets();

  const accountProxies = useSelector((state: RootState) => state.accountState.accountProxies);
  const isAllAccount = useSelector((state: RootState) => state.accountState.isAllAccount);
  const currentAccountProxy = useSelector((state: RootState) => state.accountState.currentAccountProxy);
  const assetRegistryMap = useSelector((state: RootState) => state.assetRegistry.assetRegistry);
  const chainInfoMap = useSelector((state: RootState) => state.chainStore.chainInfoMap);
  const [selectedChain, setSelectedChain] = useState<string | undefined>();
  const [selectedAccountAddressItem, setSelectedAccountAddressItem] = useState<AccountAddressItemType | undefined>();
  const { addressQrModal } = useContext(WalletModalContext);
  const chainSupported = useGetChainSlugsByAccount();
  const onHandleTonAccountWarning = useHandleTonAccountWarning();

  // chain related to tokenGroupSlug, if it is token slug
  const specificChain = useMemo(() => {
    if (tokenGroupSlug && assetRegistryMap[tokenGroupSlug]) {
      return _getAssetOriginChain(assetRegistryMap[tokenGroupSlug]);
    }

    return undefined;
  }, [assetRegistryMap, tokenGroupSlug]);

  const openAddressQrModal = useCallback((address: string, accountType: KeypairType, chainSlug: string, closeCallback?: VoidCallback, showQrBack = true) => {
    const processFunction = () => {
      addressQrModal.open({
        address,
        chainSlug,
        onBack: showQrBack ? addressQrModal.close : undefined,
        onCancel: () => {
          addressQrModal.close();
          closeCallback?.();
        }
      });
    };

    onHandleTonAccountWarning(accountType, processFunction);
  }, [addressQrModal, onHandleTonAccountWarning]);

  const onOpenReceive = useCallback(() => {
    if (!currentAccountProxy) {
      return;
    }

    if (specificChain) {
      if (!chainSupported.includes(specificChain)) {
        console.warn('tokenGroupSlug does not work with current account');

        return;
      }

      // current account is All
      if (isAllAccount) {
        activeModal(accountSelectorModalId);

        return;
      }

      // current account is not All, just do show QR logic

      const specificChainInfo = chainInfoMap[specificChain];

      if (!specificChainInfo) {
        return;
      }

      for (const accountJson of currentAccountProxy.accounts) {
        const reformatedAddress = getReformatedAddressRelatedToChain(accountJson, specificChainInfo);

        if (reformatedAddress) {
          openAddressQrModal(reformatedAddress, accountJson.type, specificChain, undefined, false);

          break;
        }
      }

      return;
    }

    activeModal(tokenSelectorModalId);
  }, [activeModal, chainInfoMap, chainSupported, currentAccountProxy, isAllAccount, openAddressQrModal, specificChain]);

  /* --- token Selector */

  const tokenSelectorItems = useMemo<_ChainAsset[]>(() => {
    const rawAssets = chainAssets.filter((asset) => chainSupported.includes(asset.originChain));

    if (tokenGroupSlug) {
      return rawAssets.filter((asset) => asset.slug === tokenGroupSlug || _getMultiChainAsset(asset) === tokenGroupSlug);
    }

    return rawAssets;
  }, [chainAssets, tokenGroupSlug, chainSupported]);

  const onCloseTokenSelector = useCallback(() => {
    inactiveModal(tokenSelectorModalId);
  }, [inactiveModal]);

  const onSelectTokenSelector = useCallback((item: _ChainAsset) => {
    // do not need the logic to check if item is compatible with currentAccountProxy here, it's already in tokenSelectorItems code block

    if (!currentAccountProxy) {
      return;
    }

    const chainSlug = _getAssetOriginChain(item);
    const chainInfo = chainInfoMap[chainSlug];

    if (!chainInfo) {
      console.warn(`Missing chainInfo with slug ${chainSlug}`);

      return;
    }

    setSelectedChain(chainSlug);

    if (isAllAccount) {
      setTimeout(() => {
        activeModal(accountSelectorModalId);
      }, 100);

      return;
    }

    // current account is not All, just do show QR logic

    for (const accountJson of currentAccountProxy.accounts) {
      const reformatedAddress = getReformatedAddressRelatedToChain(accountJson, chainInfo);

      if (reformatedAddress) {
        const accountAddressItem: AccountAddressItemType = {
          accountName: accountJson.name || '',
          accountProxyId: accountJson.proxyId || '',
          accountProxyType: currentAccountProxy.accountType,
          accountType: accountJson.type,
          address: reformatedAddress
        };

        setSelectedAccountAddressItem(accountAddressItem);
        openAddressQrModal(reformatedAddress, accountJson.type, chainSlug, () => {
          inactiveModal(tokenSelectorModalId);
        });

        break;
      }
    }
  }, [activeModal, chainInfoMap, currentAccountProxy, inactiveModal, isAllAccount, openAddressQrModal]);

  /* token Selector --- */

  /* --- account Selector */

  const accountSelectorItems = useMemo<AccountAddressItemType[]>(() => {
    const targetChain = specificChain || selectedChain;
    const chainInfo = targetChain ? chainInfoMap[targetChain] : undefined;

    if (!chainInfo) {
      return [];
    }

    const result: AccountAddressItemType[] = [];

    accountProxies.forEach((ap) => {
      ap.accounts.forEach((a) => {
        const reformatedAddress = getReformatedAddressRelatedToChain(a, chainInfo);

        if (reformatedAddress) {
          result.push({
            accountName: ap.name,
            accountProxyId: ap.id,
            accountProxyType: ap.accountType,
            accountType: a.type,
            address: reformatedAddress
          });
        }
      });
    });

    return result;
  }, [accountProxies, chainInfoMap, selectedChain, specificChain]);

  const onBackAccountSelector = useMemo(() => {
    // if specificChain has value, it means tokenSelector does not show up, so accountSelector does not have back action
    if (specificChain) {
      return undefined;
    }

    return () => {
      inactiveModal(accountSelectorModalId);
    };
  }, [inactiveModal, specificChain]);

  const onCloseAccountSelector = useCallback(() => {
    inactiveModal(accountSelectorModalId);
    inactiveModal(tokenSelectorModalId);
    setSelectedChain(undefined);
    setSelectedAccountAddressItem(undefined);
  }, [inactiveModal]);

  const onSelectAccountSelector = useCallback((item: AccountAddressItemType) => {
    const targetChain = specificChain || selectedChain;

    if (!targetChain) {
      return;
    }

    setSelectedAccountAddressItem(item);
    openAddressQrModal(item.address, item.accountType, targetChain, onCloseAccountSelector);
  }, [onCloseAccountSelector, openAddressQrModal, selectedChain, specificChain]);

  /* account Selector --- */

  useEffect(() => {
    if (addressQrModal.checkActive() && selectedAccountAddressItem) {
      addressQrModal.update((prev) => {
        if (!prev || !TON_CHAINS.includes(prev.chainSlug)) {
          return prev;
        }

        const targetAddress = accountSelectorItems.find((i) => i.accountProxyId === selectedAccountAddressItem.accountProxyId)?.address;

        if (!targetAddress) {
          return prev;
        }

        return {
          ...prev,
          address: targetAddress
        };
      });
    }
  }, [accountSelectorItems, addressQrModal, selectedAccountAddressItem]);

  return useMemo(() => ({
    onOpenReceive,
    receiveModalProps: {
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
