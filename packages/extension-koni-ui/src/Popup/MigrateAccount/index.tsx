// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { RequestMigrateSoloAccount, SoloAccountToBeMigrated } from '@subwallet/extension-base/background/KoniTypes';
import { hasAnyAccountForMigration } from '@subwallet/extension-base/services/keyring-service/utils';
import { useDefaultNavigate, useIsPopup } from '@subwallet/extension-koni-ui/hooks';
import { saveMigrationAcknowledgedStatus, windowOpen } from '@subwallet/extension-koni-ui/messaging';
import { migrateSoloAccount, migrateUnifiedAndFetchEligibleSoloAccounts } from '@subwallet/extension-koni-ui/messaging/migrate-unified-account';
import { BriefView } from '@subwallet/extension-koni-ui/Popup/MigrateAccount/BriefView';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import { MigrateAccountParam, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { ModalContext } from '@subwallet/react-ui';
import React, { useCallback, useContext, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';

import { EnterPasswordModal, enterPasswordModalId } from './EnterPasswordModal';
import { SoloAccountMigrationView } from './SoloAccountMigrationView';
import { SummaryView } from './SummaryView';

type Props = ThemeProps;

export enum ScreenView {
  BRIEF= 'brief',
  SOLO_ACCOUNT_MIGRATION= 'solo-account-migration',
  SUMMARY='summary'
}

function Component ({ className = '' }: Props) {
  const locationState = useLocation().state as MigrateAccountParam;
  const isMigrationNotion = !!locationState?.isMigrationNotion;
  const [currentScreenView, setCurrentScreenView] = useState<ScreenView>(ScreenView.BRIEF);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const { activeModal, inactiveModal } = useContext(ModalContext);
  const { goBack, goHome } = useDefaultNavigate();
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [resultProxyIds, setResultProxyIds] = useState<string[]>([]);
  const [soloAccountToBeMigratedGroups, setSoloAccountToBeMigratedGroups] = useState<SoloAccountToBeMigrated[][]>([]);
  const isPopup = useIsPopup();

  const accountProxies = useSelector((root: RootState) => root.accountState.accountProxies);

  const onClosePasswordModal = useCallback(() => {
    inactiveModal(enterPasswordModalId);
    setIsPasswordModalOpen(false);
  }, [inactiveModal]);

  const onOpenPasswordModal = useCallback(() => {
    setIsPasswordModalOpen(true);
    activeModal(enterPasswordModalId);
  }, [activeModal]);

  const onInteractAction = useCallback(() => {
    if (isMigrationNotion) {
      // flag that user acknowledge the migration
      saveMigrationAcknowledgedStatus({ isAcknowledgedMigration: true }).catch(console.error);
    }

    // for now, do nothing
  }, [isMigrationNotion]);

  const onClickDismiss = useCallback(() => {
    onInteractAction();

    // close this screen
    isMigrationNotion ? goHome() : goBack();
  }, [goBack, goHome, isMigrationNotion, onInteractAction]);

  const onClickMigrateNow = useCallback(() => {
    onInteractAction();

    if (isPopup) {
      windowOpen({ allowedPath: '/migrate-account' }).then(window.close).catch(console.log);

      return;
    }

    if (!hasAnyAccountForMigration(accountProxies)) {
      setCurrentScreenView(ScreenView.SUMMARY);
    } else {
      onOpenPasswordModal();
    }
  }, [accountProxies, isPopup, onInteractAction, onOpenPasswordModal]);

  const onSubmitPassword = useCallback(async (password: string) => {
    // migrate all account
    // open migrate solo chain accounts

    const { migratedUnifiedAccountIds,
      sessionId,
      soloAccounts } = await migrateUnifiedAndFetchEligibleSoloAccounts({ password });

    if (migratedUnifiedAccountIds.length) {
      setResultProxyIds((prev) => {
        return [
          ...prev,
          ...migratedUnifiedAccountIds
        ];
      });
    }

    const soloAccountGroups = Object.values(soloAccounts);

    if (soloAccountGroups.length) {
      setSessionId(sessionId);
      setSoloAccountToBeMigratedGroups(soloAccountGroups);

      setCurrentScreenView(ScreenView.SOLO_ACCOUNT_MIGRATION);
    } else {
      setCurrentScreenView(ScreenView.SUMMARY);
    }

    onClosePasswordModal();
  }, [onClosePasswordModal]);

  const onApproveSoloAccountMigration = useCallback(async (request: RequestMigrateSoloAccount) => {
    try {
      const { migratedUnifiedAccountId } = await migrateSoloAccount(request);

      setResultProxyIds((prev) => {
        return [...prev, migratedUnifiedAccountId];
      });
    } catch (e) {
      console.log('onApproveSoloAccountMigration error:', e);
    }
  }, []);

  const onCompleteSoloAccountsMigrationProcess = useCallback(() => {
    setCurrentScreenView(ScreenView.SUMMARY);
    setSessionId(undefined);
  }, []);

  const onClickFinish = useCallback(() => {
    goHome();
  }, [goHome]);

  return (
    <>
      {currentScreenView === ScreenView.BRIEF && (
        <BriefView
          onDismiss={onClickDismiss}
          onMigrateNow={onClickMigrateNow}
        />
      )}

      {currentScreenView === ScreenView.SOLO_ACCOUNT_MIGRATION && (
        <SoloAccountMigrationView
          onApprove={onApproveSoloAccountMigration}
          onCompleteMigrationProcess={onCompleteSoloAccountsMigrationProcess}
          sessionId={sessionId}
          soloAccountToBeMigratedGroups={soloAccountToBeMigratedGroups}
        />
      )}

      {currentScreenView === ScreenView.SUMMARY && (
        <SummaryView
          onClickFinish={onClickFinish}
          resultProxyIds={resultProxyIds}
        />
      )}

      {
        isPasswordModalOpen && (
          <EnterPasswordModal
            onClose={onClosePasswordModal}
            onSubmit={onSubmitPassword}
          />
        )
      }
    </>
  );
}

const MigrateAccount = styled(Component)<Props>(({ theme: { extendToken, token } }: Props) => {
  return ({

  });
});

export default MigrateAccount;
