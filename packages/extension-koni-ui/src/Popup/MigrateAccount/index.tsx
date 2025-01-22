// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { RequestMigrateSoloAccount, SoloAccountToBeMigrated } from '@subwallet/extension-base/background/KoniTypes';
import { hasAnyAccountForMigration } from '@subwallet/extension-base/services/keyring-service/utils';
import { useDefaultNavigate, useIsPopup } from '@subwallet/extension-koni-ui/hooks';
import { saveMigrationAcknowledgedStatus } from '@subwallet/extension-koni-ui/messaging';
import { migrateSoloAccount, migrateUnifiedAndFetchEligibleSoloAccounts } from '@subwallet/extension-koni-ui/messaging/migrate-unified-account';
import { BriefView } from '@subwallet/extension-koni-ui/Popup/MigrateAccount/BriefView';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import { ModalContext } from '@subwallet/react-ui';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const [searchParams] = useSearchParams();
  const isMigrationNotion = searchParams.has('is-notion');
  const isForcedMigration = searchParams.has('is-forced-migration');
  const [currentScreenView, setCurrentScreenView] = useState<ScreenView>(ScreenView.BRIEF);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const { activeModal, inactiveModal } = useContext(ModalContext);
  const { goHome } = useDefaultNavigate();
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [resultProxyIds, setResultProxyIds] = useState<string[]>([]);
  const [soloAccountToBeMigratedGroups, setSoloAccountToBeMigratedGroups] = useState<SoloAccountToBeMigrated[][]>([]);
  const isAcknowledgedUnifiedAccountMigration = useSelector((state: RootState) => state.settings.isAcknowledgedUnifiedAccountMigration);
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
    if (isMigrationNotion && !isAcknowledgedUnifiedAccountMigration) {
      // flag that user acknowledge the migration
      saveMigrationAcknowledgedStatus({ isAcknowledgedUnifiedAccountMigration: true }).catch(console.error);
    }

    // for now, do nothing
  }, [isAcknowledgedUnifiedAccountMigration, isMigrationNotion]);

  const onClickDismiss = useCallback(() => {
    onInteractAction();

    // close this screen
    isMigrationNotion ? goHome() : navigate('/settings/account-settings');
  }, [goHome, isMigrationNotion, navigate, onInteractAction]);

  const onClickMigrateNow = useCallback(() => {
    onInteractAction();

    if (!hasAnyAccountForMigration(accountProxies)) {
      setCurrentScreenView(ScreenView.SUMMARY);
    } else {
      onOpenPasswordModal();
    }
  }, [accountProxies, onInteractAction, onOpenPasswordModal]);

  const onSubmitPassword = useCallback(async (password: string) => {
    // migrate all account
    // open migrate solo chain accounts

    const { sessionId, soloAccounts } = await migrateUnifiedAndFetchEligibleSoloAccounts({ password });

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

  useEffect(() => {
    if (!isPopup) {
      goHome();
    }
  }, [goHome, isPopup]);

  return (
    <>
      {currentScreenView === ScreenView.BRIEF && (
        <BriefView
          isForcedMigration={isForcedMigration}
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
