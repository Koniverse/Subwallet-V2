// Copyright 2019-2022 @subwallet/extension-web-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NotificationType } from '@subwallet/extension-base/background/KoniTypes';
import { AccountProxy } from '@subwallet/extension-base/types';
import { WalletModalContext } from '@subwallet/extension-web-ui/contexts/WalletModalContextProvider';
import { useSelector, useTranslation } from '@subwallet/extension-web-ui/hooks';
import { VoidFunction } from '@subwallet/extension-web-ui/types';
import { ledgerGenericAccountProblemCheck } from '@subwallet/extension-web-ui/utils';
import { CheckCircle, XCircle } from 'phosphor-react';
import React, { useCallback, useContext } from 'react';

type HookInputInfo = {
  accountProxy: AccountProxy | null | undefined;
  chainSlug: string;
}
type HookType = (inputInfo: HookInputInfo, processFunction: VoidFunction) => void;

export default function useHandleLedgerGenericAccountWarning (): HookType {
  const { t } = useTranslation();
  const ledgerGenericAllowNetworks = useSelector((state) => state.chainStore.ledgerGenericAllowNetworks);
  const chainInfoMap = useSelector((state) => state.chainStore.chainInfoMap);
  const { alertModal } = useContext(WalletModalContext);

  return useCallback(({ accountProxy, chainSlug }, processFunction: VoidFunction) => {
    const ledgerCheck = ledgerGenericAccountProblemCheck(accountProxy);

    if (ledgerCheck !== 'unnecessary' && !ledgerGenericAllowNetworks.includes(chainSlug)) {
      alertModal.open({
        closable: false,
        title: t('Unsupported network'),
        subtitle: t('Do you still want to get the address?'),
        type: NotificationType.WARNING,
        content: (
          <>
            <div>
              {t(
                'Ledger {{ledgerApp}} accounts are NOT compatible with {{networkName}} network. Tokens will get stuck (i.e., can’t be transferred out or staked) when sent to this account type.',
                {
                  replace: {
                    ledgerApp: ledgerCheck === 'polkadot' ? 'Polkadot' : 'Migration',
                    networkName: chainInfoMap[chainSlug]?.name
                  }
                }
              )}
            </div>
          </>
        ),
        cancelButton: {
          text: t('Cancel'),
          icon: XCircle,
          iconWeight: 'fill',
          onClick: () => {
            alertModal.close();
          },
          schema: 'secondary'
        },
        okButton: {
          text: t('Get address'),
          icon: CheckCircle,
          iconWeight: 'fill',
          onClick: () => {
            alertModal.close();

            processFunction();
          },
          schema: 'primary'
        }
      });

      return;
    }

    processFunction();
  }, [alertModal, chainInfoMap, ledgerGenericAllowNetworks, t]);
}
