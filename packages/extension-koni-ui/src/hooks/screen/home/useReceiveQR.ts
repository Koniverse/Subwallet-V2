// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { KeypairType } from '@subwallet/keyring/types';

import { _ChainAsset } from '@subwallet/chain-list/types';
import { AccountJson, AccountProxy } from '@subwallet/extension-base/background/types';
import { _getMultiChainAsset, _isAssetFungibleToken, _isNativeToken } from '@subwallet/extension-base/services/chain-service/utils';
import { AccountSelectorModalId } from '@subwallet/extension-koni-ui/components/Modal/AccountSelectorModal';
import { SUPPORT_CHAINS } from '@subwallet/extension-koni-ui/constants';
import { RECEIVE_QR_MODAL, RECEIVE_TOKEN_SELECTOR_MODAL } from '@subwallet/extension-koni-ui/constants/modal';
import { useChainAssets } from '@subwallet/extension-koni-ui/hooks/assets';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import { ReceiveTokenItemType } from '@subwallet/extension-koni-ui/types';
import { isAccountAll as checkIsAccountAll } from '@subwallet/extension-koni-ui/utils';
import { getKeypairTypeByAddress } from '@subwallet/keyring';
import { ModalContext } from '@subwallet/react-ui';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

type ReceiveSelectedResult = {
  selectedAccountProxyId?: string;
  selectedAccountProxyAddress?: string;
  selectedNetwork?: string;
};

function getTokenSelectorItem (asset: _ChainAsset, accountProxy: AccountProxy): ReceiveTokenItemType | null {
  if (!_isAssetFungibleToken(asset) || !SUPPORT_CHAINS.includes(asset.originChain)) {
    return null;
  }

  let targetAccount: AccountJson | undefined;

  for (const account of accountProxy.accounts) {
    const accountType = getKeypairTypeByAddress(account.address);

    if ((accountType === 'ethereum' && asset.originChain === 'ethereum' && _isNativeToken(asset)) ||
      (accountType === 'bitcoin-84' && asset.originChain === 'bitcoin') ||
      (accountType === 'bitcoin-86' && asset.originChain === 'bitcoin' && asset.metadata?.runeId) ||
      (accountType === 'bittest-84' && asset.originChain === 'bitcoinTestnet')) {
      targetAccount = {
        ...account,
        type: accountType
      };

      break;
    }
  }

  if (!targetAccount) {
    return null;
  }

  const isRune = !!asset.metadata?.runeId;
  const order = (() => {
    if (isRune) {
      return 2;
    }

    if (asset.originChain === 'bitcoin') {
      return 1;
    }

    if (asset.originChain === 'bitcoinTestnet') {
      return 3;
    }

    if (asset.originChain === 'ethereum') {
      return 4;
    }

    return 99;
  })();

  return {
    ...asset,
    address: targetAccount.address,
    addressType: targetAccount.type as KeypairType,
    isRune,
    order
  };
}

export default function useReceiveQR (tokenGroupSlug?: string) {
  const { activeModal, inactiveModal } = useContext(ModalContext);
  const isAllAccount = useSelector((state: RootState) => state.accountState.isAllAccount);
  const accountProxies = useSelector((state: RootState) => state.accountState.accountProxies);
  const currentAccountProxy = useSelector((state: RootState) => state.accountState.currentAccountProxy);
  const assetRegistryMap = useChainAssets().chainAssetRegistry;
  const [tokenSelectorItems, setTokenSelectorItems] = useState<ReceiveTokenItemType[]>([]);
  const [{ selectedAccountProxyAddress, selectedAccountProxyId, selectedNetwork }, setReceiveSelectedResult] = useState<ReceiveSelectedResult>(
    { selectedAccountProxyId: isAllAccount ? undefined : currentAccountProxy?.proxyId }
  );

  const accountSelectorItems = useMemo<AccountProxy[]>(() => {
    if (!isAllAccount) {
      return [];
    }

    return accountProxies.filter((ap) => !checkIsAccountAll(ap.proxyId));
  }, [isAllAccount, accountProxies]);

  const getTokenSelectorItems = useCallback((accountProxy: AccountProxy) => {
    // if tokenGroupSlug is token slug
    if (tokenGroupSlug && assetRegistryMap[tokenGroupSlug]) {
      const tokenItem = getTokenSelectorItem(assetRegistryMap[tokenGroupSlug], accountProxy);

      if (tokenItem) {
        return [tokenItem];
      }

      return [];
    }

    const result: ReceiveTokenItemType[] = [];

    let runeTokenFlag = false;

    Object.values(assetRegistryMap).forEach((asset) => {
      if (tokenGroupSlug && (_getMultiChainAsset(asset) !== tokenGroupSlug)) {
        return;
      }

      const tokenItem = getTokenSelectorItem(asset, accountProxy);

      if (!tokenItem) {
        return;
      }

      if (tokenItem.isRune && !runeTokenFlag) {
        result.push(tokenItem);

        runeTokenFlag = true;
      } else if (!tokenItem.isRune) {
        result.push(tokenItem);
      }
    });

    result.sort((a, b) => a.order - b.order);

    return result;
  }, [tokenGroupSlug, assetRegistryMap]);

  const onOpenReceive = useCallback(() => {
    if (!currentAccountProxy) {
      return;
    }

    if (checkIsAccountAll(currentAccountProxy.proxyId)) {
      activeModal(AccountSelectorModalId);
    } else {
      const _tokenSelectorItems = getTokenSelectorItems(currentAccountProxy);

      setTokenSelectorItems(_tokenSelectorItems);

      if (tokenGroupSlug) {
        if (_tokenSelectorItems.length === 1) {
          setReceiveSelectedResult((prev) => ({ ...prev, selectedNetwork: _tokenSelectorItems[0].originChain, selectedAccountProxyAddress: _tokenSelectorItems[0].address }));
          activeModal(RECEIVE_QR_MODAL);

          return;
        }
      }

      activeModal(RECEIVE_TOKEN_SELECTOR_MODAL);
    }
  }, [activeModal, currentAccountProxy, getTokenSelectorItems, tokenGroupSlug]);

  const onSelectAccountProxy = useCallback((accountProxy: AccountProxy) => {
    setReceiveSelectedResult({ selectedAccountProxyId: accountProxy.proxyId });
    const _tokenSelectorItems = getTokenSelectorItems(accountProxy);

    setTokenSelectorItems(_tokenSelectorItems);

    if (tokenGroupSlug) {
      if (_tokenSelectorItems.length === 1) {
        setReceiveSelectedResult((prev) => ({ ...prev, selectedNetwork: _tokenSelectorItems[0].originChain, selectedAccountProxyAddress: _tokenSelectorItems[0].address }));
        activeModal(RECEIVE_QR_MODAL);
        inactiveModal(AccountSelectorModalId);

        return;
      }
    }

    activeModal(RECEIVE_TOKEN_SELECTOR_MODAL);
    inactiveModal(AccountSelectorModalId);
  }, [activeModal, getTokenSelectorItems, inactiveModal, tokenGroupSlug]);

  const onSelectToken = useCallback((item: ReceiveTokenItemType) => {
    setReceiveSelectedResult((prevState) => ({ ...prevState, selectedNetwork: item.originChain, selectedAccountProxyAddress: item.address }));
  }, []);

  useEffect(() => {
    setReceiveSelectedResult((prev) => ({
      ...prev,
      selectedAccountProxyId: currentAccountProxy?.proxyId
    }));
  }, [currentAccountProxy?.proxyId]);

  return {
    onOpenReceive,
    onSelectAccountProxy,
    onSelectToken,
    accountSelectorItems,
    tokenSelectorItems,
    selectedAccountProxyId,
    selectedAccountProxyAddress,
    selectedNetwork
  };
}
