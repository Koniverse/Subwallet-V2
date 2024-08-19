// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NotificationType } from '@subwallet/extension-base/background/KoniTypes';
import { WalletModalContext } from '@subwallet/extension-koni-ui/contexts/WalletModalContextProvider';
import { useSetSelectedMnemonicType, useTranslation } from '@subwallet/extension-koni-ui/hooks';
import { AccountNetworkAddress } from '@subwallet/extension-koni-ui/types';
import { CheckCircle, XCircle } from 'phosphor-react';
import React, { useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

type HookType = (item: AccountNetworkAddress) => void;

export default function useViewAccountAddressQr (): HookType {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setSelectedMnemonicType = useSetSelectedMnemonicType(true);
  const { addressQrModal, alertModal } = useContext(WalletModalContext);

  return useCallback((item: AccountNetworkAddress) => {
    const openAddressQrModal = () => {
      addressQrModal.open({
        address: item.address,
        chainSlug: item.slug,
        onBack: addressQrModal.close,
        onCancel: () => {
          addressQrModal.close();
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
          text: t('OK'),
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
  }, [addressQrModal, alertModal, navigate, setSelectedMnemonicType, t]);
}
