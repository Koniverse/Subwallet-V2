// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { KeypairType } from '@subwallet/keyring/types';

import { _ChainAsset } from '@subwallet/chain-list/types';
import { NotificationType } from '@subwallet/extension-base/background/KoniTypes';
import { _getAssetOriginChain, _getMultiChainAsset } from '@subwallet/extension-base/services/chain-service/utils';
import { RECEIVE_MODAL_ACCOUNT_SELECTOR, RECEIVE_MODAL_TOKEN_SELECTOR } from '@subwallet/extension-koni-ui/constants';
import { WalletModalContext } from '@subwallet/extension-koni-ui/contexts/WalletModalContextProvider';
import { useGetChainSlugsByAccount, useSetSelectedMnemonicType, useTranslation } from '@subwallet/extension-koni-ui/hooks';
import { useChainAssets } from '@subwallet/extension-koni-ui/hooks/assets';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import { AccountAddressItemType, ReceiveModalProps } from '@subwallet/extension-koni-ui/types';
import { getReformatedAddressRelatedToChain } from '@subwallet/extension-koni-ui/utils';
import { ModalContext } from '@subwallet/react-ui';
import { CheckCircle, XCircle } from 'phosphor-react';
import React, { useCallback, useContext, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

type HookType = {
  onOpenReceive: VoidFunction;
  receiveModalProps: ReceiveModalProps;
};

const tokenSelectorModalId = RECEIVE_MODAL_TOKEN_SELECTOR;
const accountSelectorModalId = RECEIVE_MODAL_ACCOUNT_SELECTOR;

export default function useCoreReceiveModalHelper (tokenGroupSlug?: string): HookType {
  const { activeModal, inactiveModal } = useContext(ModalContext);
  const { chainAssets } = useChainAssets();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setSelectedMnemonicType = useSetSelectedMnemonicType(true);

  const accountProxies = useSelector((state: RootState) => state.accountState.accountProxies);
  const isAllAccount = useSelector((state: RootState) => state.accountState.isAllAccount);
  const currentAccountProxy = useSelector((state: RootState) => state.accountState.currentAccountProxy);
  const assetRegistryMap = useSelector((state: RootState) => state.assetRegistry.assetRegistry);
  const chainInfoMap = useSelector((state: RootState) => state.chainStore.chainInfoMap);
  const [selectedChain, setSelectedChain] = useState<string | undefined>();
  const { addressQrModal, alertModal } = useContext(WalletModalContext);
  const chainSupported = useGetChainSlugsByAccount();

  // chain related to tokenGroupSlug, if it is token slug
  const specificChain = useMemo(() => {
    if (tokenGroupSlug && assetRegistryMap[tokenGroupSlug]) {
      return _getAssetOriginChain(assetRegistryMap[tokenGroupSlug]);
    }

    return undefined;
  }, [assetRegistryMap, tokenGroupSlug]);

  const openAddressQrModal = useCallback((address: string, accountType: KeypairType, chainSlug: string, closeCallback?: VoidCallback, showQrBack = true) => {
    const _openAddressQrModal = () => {
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

    if (accountType === 'ton') {
      alertModal.open({
        closable: false,
        title: t('Seed phrase incompatibility'),
        type: NotificationType.WARNING,
        content: (
          <>
            <div>
              {t('Importing this seed phrase will generate a unified account that can be used on multiple ecosystems including Polkadot, Ethereum, Bitcoin, and TON.')}
            </div>
            <br />
            <div>
              {t('However, SubWallet is not compatible with TON-native wallets. This means that with the same seed phrase, SubWallet and TON-native wallets will generate two different TON addresses.')}
            </div>
          </>
        ),
        cancelButton: {
          text: t('Cancel'),
          icon: XCircle,
          iconWeight: 'fill',
          onClick: () => {
            alertModal.close();
            closeCallback?.();
          },
          schema: 'secondary'
        },
        okButton: {
          text: t('Apply'),
          icon: CheckCircle,
          iconWeight: 'fill',
          onClick: () => {
            setSelectedMnemonicType('ton');
            navigate('/accounts/new-seed-phrase');

            alertModal.close();
          },
          schema: 'primary'
        }
      });

      return;
    }

    _openAddressQrModal();
  }, [addressQrModal, alertModal, navigate, setSelectedMnemonicType, t]);

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

    setSelectedChain(item.originChain);

    if (isAllAccount) {
      setTimeout(() => {
        activeModal(accountSelectorModalId);
      }, 100);

      return;
    }

    // current account is not All, just do show QR logic

    const chainSlug = _getAssetOriginChain(item);
    const chainInfo = chainInfoMap[chainSlug];

    if (!chainInfo) {
      return;
    }

    for (const accountJson of currentAccountProxy.accounts) {
      const reformatedAddress = getReformatedAddressRelatedToChain(accountJson, chainInfo);

      if (reformatedAddress) {
        openAddressQrModal(reformatedAddress, accountJson.type, chainSlug);

        break;
      }
    }
  }, [activeModal, chainInfoMap, currentAccountProxy, isAllAccount, openAddressQrModal]);

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
  }, [inactiveModal]);

  const onSelectAccountSelector = useCallback((item: AccountAddressItemType) => {
    const targetChain = specificChain || selectedChain;

    if (!targetChain) {
      return;
    }

    openAddressQrModal(item.address, item.accountType, targetChain, onCloseAccountSelector);
  }, [onCloseAccountSelector, openAddressQrModal, selectedChain, specificChain]);

  /* account Selector --- */

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
