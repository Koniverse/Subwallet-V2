// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NotificationType } from '@subwallet/extension-base/background/KoniTypes';
import { CONFIRM_TERM_SEED_PHRASE } from '@subwallet/extension-koni-ui/constants';
import { WalletModalContext } from '@subwallet/extension-koni-ui/contexts/WalletModalContextProvider';
import { useSetSelectedMnemonicType, useTranslation } from '@subwallet/extension-koni-ui/hooks';
import { SeedPhraseTermStorage, VoidFunction } from '@subwallet/extension-koni-ui/types';
import { KeypairType } from '@subwallet/keyring/types';
import { CheckCircle, XCircle } from 'phosphor-react';
import React, { useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStorage } from 'usehooks-ts';

type HookType = (accountType: KeypairType, processFunction: VoidFunction) => void;
const GeneralTermLocalDefault: SeedPhraseTermStorage = { state: 'nonConfirmed', useDefaultContent: false };

export default function useHandleTonAccountWarning (): HookType {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [, setIsConfirmTermSeedPhrase] = useLocalStorage<SeedPhraseTermStorage>(CONFIRM_TERM_SEED_PHRASE, GeneralTermLocalDefault);
  const setSelectedMnemonicType = useSetSelectedMnemonicType(true);
  const { alertModal } = useContext(WalletModalContext);

  return useCallback((accountType: KeypairType, processFunction: VoidFunction) => {
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
            processFunction();
          },
          schema: 'secondary'
        },
        okButton: {
          text: t('OK'),
          icon: CheckCircle,
          iconWeight: 'fill',
          onClick: () => {
            setSelectedMnemonicType('ton');
            setIsConfirmTermSeedPhrase((prevState: string | SeedPhraseTermStorage) => {
              // Note: This condition is to migrate the old data structure is "string" in localStorage to the new data structure in "SeedPhraseTermStorage".
              if (typeof prevState === 'string') {
                return { state: prevState, useDefaultContent: true };
              } else {
                return { ...prevState, useDefaultContent: true };
              }
            });
            navigate('/accounts/new-seed-phrase');

            alertModal.close();
          },
          schema: 'primary'
        }
      });

      return;
    }

    processFunction();
  }, [alertModal, navigate, setIsConfirmTermSeedPhrase, setSelectedMnemonicType, t]);
}
