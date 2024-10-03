// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import { AccountChainType } from '@subwallet/extension-base/types';
import { detectTranslate } from '@subwallet/extension-base/utils';
import { ALL_STAKING_ACTIONS, isLedgerCapable, isProductionMode, ledgerIncompatible } from '@subwallet/extension-koni-ui/constants';
// TODO: Use AccountSignMode from the background for consistency.
import { AccountSignMode } from '@subwallet/extension-koni-ui/types';
import { useCallback } from 'react';

import { useNotification, useTranslation } from '../common';
import useGetAccountByAddress from './useGetAccountByAddress';

const usePreCheckAction = (address?: string, blockAllAccount = true, message?: string): ((onClick: VoidFunction, action: ExtrinsicType) => VoidFunction) => {
  const notify = useNotification();
  const { t } = useTranslation();

  const account = useGetAccountByAddress(address);

  const getAccountTypeTitle = useCallback((signMode: AccountSignMode): string => {
    switch (signMode) {
      case AccountSignMode.LEGACY_LEDGER:
      case AccountSignMode.GENERIC_LEDGER:
        return t('Ledger account');
      case AccountSignMode.ALL_ACCOUNT:
        return t('All account');
      case AccountSignMode.PASSWORD:
        return t('Normal account');
      case AccountSignMode.QR:
        return t('QR signer account');
      case AccountSignMode.READ_ONLY:
        return t('Watch-only account');
      case AccountSignMode.UNKNOWN:
      default:
        return t('Unknown account');
    }
  }, [t]);

  return useCallback((onClick: VoidFunction, action: ExtrinsicType) => {
    return () => {
      if (!account) {
        notify({
          message: t('Account not exists'),
          type: 'info',
          duration: 1.5
        });
      } else {
        const mode = account.signMode;
        let block = false;
        let accountTitle = getAccountTypeTitle(mode);
        let defaultMessage = detectTranslate('The account you are using is {{accountTitle}}, you cannot use this feature with it');

        if (ALL_STAKING_ACTIONS.includes(action)) {
          defaultMessage = detectTranslate('You are using a {{accountTitle}}. Earning is not supported with this account type');
        }

        if (!account.transactionActions.includes(action) || (mode === AccountSignMode.QR && account.chainType === 'ethereum' && isProductionMode)) {
          block = true;

          switch (mode) {
            case AccountSignMode.ALL_ACCOUNT:
              if (!blockAllAccount) {
                block = false;
              }

              break;

            case AccountSignMode.QR:
              accountTitle = t('EVM QR signer account');
              break;

            case AccountSignMode.LEGACY_LEDGER:
            case AccountSignMode.GENERIC_LEDGER:
              if (account.chainType === AccountChainType.ETHEREUM) {
                accountTitle = t('Ledger - EVM account');
              } else if (account.chainType === AccountChainType.SUBSTRATE) {
                accountTitle = t('Ledger - Substrate account');
              }

              break;
          }
        }

        if (mode === AccountSignMode.LEGACY_LEDGER || mode === AccountSignMode.GENERIC_LEDGER) {
          if (!isLedgerCapable) {
            notify({
              message: t(ledgerIncompatible),
              type: 'error',
              duration: 8
            });

            return;
          }
        }

        if (!block) {
          onClick();
        } else {
          notify({
            message: t(
              message ?? defaultMessage,
              { replace: { accountTitle: accountTitle } }
            ),
            type: 'info',
            duration: 8
          });
        }
      }
    };
  }, [account, blockAllAccount, getAccountTypeTitle, message, notify, t]);
};

export default usePreCheckAction;
