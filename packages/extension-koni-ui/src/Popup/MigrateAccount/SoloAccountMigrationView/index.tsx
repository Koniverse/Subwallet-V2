// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { RequestMigrateSoloAccount, SoloAccountToBeMigrated } from '@subwallet/extension-base/background/KoniTypes';
import { pingSession } from '@subwallet/extension-koni-ui/messaging/migrate-unified-account';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';

import { ProcessViewItem } from './ProcessViewItem';

type Props = ThemeProps & {
  soloAccountToBeMigratedGroups: SoloAccountToBeMigrated[][];
  onApprove: (request: RequestMigrateSoloAccount) => Promise<void>;
  sessionId?: string;
  onCompleteMigrationProcess: VoidFunction;
};

function Component ({ onApprove, onCompleteMigrationProcess, sessionId, soloAccountToBeMigratedGroups }: Props) {
  const [currentProcessOrdinal, setCurrentProcessOrdinal] = useState<number>(1);
  const totalProcessSteps = soloAccountToBeMigratedGroups.length;

  const performNextProcess = useCallback(() => {
    if (currentProcessOrdinal === totalProcessSteps) {
      onCompleteMigrationProcess();

      return;
    }

    setCurrentProcessOrdinal((prev) => prev + 1);
  }, [currentProcessOrdinal, onCompleteMigrationProcess, totalProcessSteps]);

  const onSkip = useCallback(() => {
    performNextProcess();
  }, [performNextProcess]);

  const _onApprove = useCallback(async (soloAccounts: SoloAccountToBeMigrated[], accountName: string) => {
    if (!sessionId) {
      return;
    }

    await onApprove({
      soloAccounts,
      sessionId,
      accountName
    });

    performNextProcess();
  }, [onApprove, performNextProcess, sessionId]);

  const currentSoloAccountToBeMigratedGroup = soloAccountToBeMigratedGroups[currentProcessOrdinal - 1];

  useEffect(() => {
    // keep the session alive while in this view

    let timer: NodeJS.Timer;

    if (sessionId) {
      const doPing = () => {
        pingSession({ sessionId }).catch(console.error);
      };

      timer = setInterval(() => {
        doPing();
        clearInterval(timer);
      }, 1000);

      doPing();
    }

    return () => {
      clearInterval(timer);
    };
  }, [sessionId]);

  return (
    <>
      {
        !!currentSoloAccountToBeMigratedGroup && (
          <ProcessViewItem
            currentProcessOrdinal={currentProcessOrdinal}
            currentSoloAccountToBeMigratedGroup={currentSoloAccountToBeMigratedGroup}
            key={`ProcessViewItem-${currentProcessOrdinal}`}
            onApprove={_onApprove}
            onSkip={onSkip}
            totalProcessSteps={totalProcessSteps}
          />
        )
      }
    </>
  );
}

export const SoloAccountMigrationView = styled(Component)<Props>(({ theme: { extendToken, token } }: Props) => {
  return ({

  });
});
