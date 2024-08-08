// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainAsset } from '@subwallet/chain-list/types';
import { NotificationType } from '@subwallet/extension-base/background/KoniTypes';
import { _getMultiChainAsset } from '@subwallet/extension-base/services/chain-service/utils';
import { AccountNetworkType } from '@subwallet/extension-base/types';
import { reformatAddress } from '@subwallet/extension-base/utils';
import { RECEIVE_MODAL_ACCOUNT_SELECTOR, RECEIVE_MODAL_TOKEN_SELECTOR } from '@subwallet/extension-koni-ui/constants';
import { WalletModalContext } from '@subwallet/extension-koni-ui/contexts/WalletModalContextProvider';
import { useSetSelectedMnemonicType, useTranslation } from '@subwallet/extension-koni-ui/hooks';
import { useChainAssets } from '@subwallet/extension-koni-ui/hooks/assets';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import { AccountAddressItemType, ReceiveModalProps } from '@subwallet/extension-koni-ui/types';
import { isChainInfoAccordantNetworkType } from '@subwallet/extension-koni-ui/utils';
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

export default function useReceiveModalHelper (tokenGroupSlug?: string): HookType {
  const { activeModal, inactiveModal } = useContext(ModalContext);
  const chainAssets = useChainAssets().chainAssets;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setSelectedMnemonicType = useSetSelectedMnemonicType(false);

  const accountProxies = useSelector((state: RootState) => state.accountState.accountProxies);
  const chainInfoMap = useSelector((state: RootState) => state.chainStore.chainInfoMap);
  const [selectedNetwork, setSelectedNetwork] = useState<string | undefined>();
  const { addressQrModal, alertModal } = useContext(WalletModalContext);

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
    setSelectedNetwork(item.originChain);
    setTimeout(() => {
      activeModal(accountSelectorModalId);
    }, 100);
  }, [activeModal]);

  /* token Selector --- */

  /* --- account Selector */

  // todo: recheck logic with ledger account
  const accountSelectorItems = useMemo<AccountAddressItemType[]>(() => {
    const chainInfo = selectedNetwork ? chainInfoMap[selectedNetwork] : undefined;

    if (!chainInfo) {
      return [];
    }

    const result: AccountAddressItemType[] = [];

    accountProxies.forEach((ap) => {
      ap.accounts.forEach((a) => {
        if (!isChainInfoAccordantNetworkType(chainInfo, a.networkType)) {
          return;
        }

        const item = {
          accountName: ap.name,
          accountProxyId: ap.id,
          accountType: a.type
        };

        if (a.networkType === AccountNetworkType.SUBSTRATE && chainInfo.substrateInfo) {
          result.push({
            ...item,
            address: reformatAddress(a.address, chainInfo.substrateInfo.addressPrefix)
          });
        } else if (a.networkType === AccountNetworkType.ETHEREUM && chainInfo.evmInfo) {
          result.push({
            ...item,
            address: a.address
          });
        } else if (a.networkType === AccountNetworkType.TON && chainInfo.tonInfo) {
          result.push({
            ...item,
            address: reformatAddress(a.address, chainInfo.isTestnet ? 0 : 1)
          });
        }
      });
    });

    return result;
  }, [accountProxies, chainInfoMap, selectedNetwork]);

  const onBackAccountSelector = useCallback(() => {
    inactiveModal(accountSelectorModalId);
  }, [inactiveModal]);

  const onCloseAccountSelector = useCallback(() => {
    inactiveModal(accountSelectorModalId);
    inactiveModal(tokenSelectorModalId);
    setSelectedNetwork(undefined);
  }, [inactiveModal]);

  const onSelectAccountSelector = useCallback((item: AccountAddressItemType) => {
    if (!selectedNetwork) {
      return;
    }

    const openAddressQrModal = () => {
      addressQrModal.open({
        address: item.address,
        chainSlug: selectedNetwork,
        onBack: addressQrModal.close,
        onCancel: () => {
          addressQrModal.close();
          onCloseAccountSelector();
        }
      });
    };

    if (item.accountType === 'ton') {
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
            openAddressQrModal();
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

    openAddressQrModal();

    // todo: if is unified account with TON, need show warning about create solo TON account
  }, [addressQrModal, alertModal, navigate, onCloseAccountSelector, selectedNetwork, setSelectedMnemonicType, t]);

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
