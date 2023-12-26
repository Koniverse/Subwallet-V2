// Copyright 2019-2022 @polkadot/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { SWTransactionResponse } from '@subwallet/extension-base/services/transaction-service/types';
import { detectTranslate } from '@subwallet/extension-base/utils';
import { useCallback, useMemo } from 'react';

import { useNotification, useTranslation } from '../common';

const rejectMessage = detectTranslate('Rejected by user');
const cannotConnectMessage = 'connection not open on send()';

const useHandleSubmitTransaction = (onDone: (extrinsicHash: string) => void, setIgnoreWarnings?: (value: boolean) => void) => {
  const notify = useNotification();
  const { t } = useTranslation();

  const onSuccess = useCallback((rs: SWTransactionResponse) => {
    const { errors, id, warnings } = rs;

    if (errors.length || warnings.length) {
      if (![t(rejectMessage), rejectMessage, cannotConnectMessage].includes(errors[0]?.message)) {
        notify({
          message: errors[0]?.message || warnings[0]?.message,
          type: errors.length ? 'error' : 'warning'
        });
      } else if ([cannotConnectMessage].includes(errors[0]?.message)) {
        notify({
          message: t('Connection failed. Check your internet connection or change your network endpoint.'),
          type: 'error'
        });
      }

      if (!errors.length) {
        warnings[0] && setIgnoreWarnings?.(true);
      }
    } else if (id) {
      onDone(id);
    }
  }, [t, notify, onDone, setIgnoreWarnings]);

  const onError = useCallback((error: Error) => {
    notify({
      message: t(error.message),
      type: 'error'
    });
  }, [t, notify]);

  return useMemo(() => ({
    onSuccess,
    onError
  }), [onError, onSuccess]);
};

export default useHandleSubmitTransaction;
