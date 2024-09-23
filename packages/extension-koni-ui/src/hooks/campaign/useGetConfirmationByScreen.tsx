// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AppOnlineContentContext } from '@subwallet/extension-koni-ui/contexts/AppOnlineContentProvider';
import { Button } from '@subwallet/react-ui';
import React, { useCallback, useContext, useMemo } from 'react';

const useGetConfirmationByScreen = (screen: string) => {
  const { appConfirmationMap, checkPositionParam, updateConfirmationHistoryMap } = useContext(AppOnlineContentContext);

  const confirmations = useMemo(() => {
    return appConfirmationMap[screen] || [];
  }, [appConfirmationMap, screen]);

  const getCurrentConfirmation = useCallback(
    (compareVals: string[]) => {
      return confirmations.find((item) => {
        return checkPositionParam(screen, item.position_params, compareVals);
      });
    },
    [checkPositionParam, confirmations, screen]
  );

  const onClickCancelBtn = useCallback((confirmationId: string, onClickCancel: VoidFunction) => {
    return () => {
      updateConfirmationHistoryMap(confirmationId);
      onClickCancel();
    };
  }, [updateConfirmationHistoryMap]);

  const onClickConfirmBtn = useCallback((confirmationId: string, onClickOk: VoidFunction) => {
    return () => {
      updateConfirmationHistoryMap(confirmationId);
      onClickOk();
    };
  }, [updateConfirmationHistoryMap]);

  const renderConfirmationButtons = useCallback(
    (onClickCancel: () => void, onClickOk: () => void) => {
      if (!confirmations || !confirmations.length) {
        return <></>;
      }

      const confirmationId = `${confirmations[0].position}-${confirmations[0].id}`;

      return (
        <div style={{ marginTop: 16, display: 'flex' }}>
          <Button
            block
            onClick={onClickCancelBtn(confirmationId, onClickCancel)}
            schema={'secondary'}
          >
            {confirmations[0].cancel_label}
          </Button>
          <Button
            block
            onClick={onClickConfirmBtn(confirmationId, onClickOk)}
          >
            {confirmations[0].confirm_label}
          </Button>
        </div>
      );
    },
    [confirmations, onClickCancelBtn, onClickConfirmBtn]
  );

  return { confirmations, renderConfirmationButtons, getCurrentConfirmation };
};

export default useGetConfirmationByScreen;
