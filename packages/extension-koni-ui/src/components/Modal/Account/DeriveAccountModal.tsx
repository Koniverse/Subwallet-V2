// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {AccountActions, AccountProxy} from '@subwallet/extension-base/types';
import BackIcon from '@subwallet/extension-koni-ui/components/Icon/BackIcon';
import {
  ACCOUNT_NAME_MODAL,
  CREATE_ACCOUNT_MODAL,
  DERIVE_ACCOUNT_MODAL
} from '@subwallet/extension-koni-ui/constants/modal';
import { useSetSessionLatest } from '@subwallet/extension-koni-ui/hooks';
import useNotification from '@subwallet/extension-koni-ui/hooks/common/useNotification';
import useTranslation from '@subwallet/extension-koni-ui/hooks/common/useTranslation';
import useUnlockChecker from '@subwallet/extension-koni-ui/hooks/common/useUnlockChecker';
import useClickOutSide from '@subwallet/extension-koni-ui/hooks/dom/useClickOutSide';
import useSwitchModal from '@subwallet/extension-koni-ui/hooks/modal/useSwitchModal';
import { deriveAccountV3 } from '@subwallet/extension-koni-ui/messaging';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import {Theme, ThemeProps} from '@subwallet/extension-koni-ui/types';
import { searchAccountFunction } from '@subwallet/extension-koni-ui/utils/account/account';
import { renderModalSelector } from '@subwallet/extension-koni-ui/utils/common/dom';
import { ActivityIndicator, ModalContext, SwList, SwModal } from '@subwallet/react-ui';
import { SwListSectionRef } from '@subwallet/react-ui/es/sw-list';
import CN from 'classnames';
import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import { useSelector } from 'react-redux';
import styled, { useTheme } from 'styled-components';

import { GeneralEmptyList } from '../../EmptyList';
import {AccountNameModal, AccountProxyItem} from "@subwallet/extension-koni-ui/components";

type Props = ThemeProps;

const modalId = DERIVE_ACCOUNT_MODAL;
const accountNameModalId = 'derive.' + ACCOUNT_NAME_MODAL
const renderEmpty = () => <GeneralEmptyList />;

const renderLoaderIcon = (x: React.ReactNode): React.ReactNode => {
  return (
    <>
      {x}
      <div className='loading-icon'>
        <ActivityIndicator />
      </div>
    </>
  );
};

const Component: React.FC<Props> = ({ className }: Props) => {
  const { t } = useTranslation();
  const { token } = useTheme() as Theme;
  const notify = useNotification();
  const sectionRef = useRef<SwListSectionRef>(null);
  const [accountSelected, setAccountSelected] = useState<AccountProxy>()
  const { checkActive, inactiveModal, activeModal } = useContext(ModalContext);
  const { setStateSelectAccount } = useSetSessionLatest();
  const checkUnlock = useUnlockChecker();

  const accountProxies = useSelector((state: RootState) => state.accountState.accountProxies);

  const isActive = checkActive(modalId);

  const [selected, setSelected] = useState('');

  const filtered = useMemo(
    () => accountProxies
      .filter(({ accountActions }) => accountActions.includes(AccountActions.DERIVE)),
    [accountProxies]
  );

  const clearSearch = useCallback(() => {
    sectionRef.current?.setSearchValue('');
  }, []);

  const onCancel = useCallback(() => {
    setStateSelectAccount(true);
    inactiveModal(modalId);
    clearSearch();
  }, [clearSearch, inactiveModal, setStateSelectAccount]);

  useClickOutSide(isActive || !!selected, renderModalSelector(className), onCancel);

  const onSelectAccount = useCallback((account: AccountProxy): () => void => {
    return () => {
      checkUnlock().then(() => {
        setAccountSelected(account);
      }).catch(() => {
        // User cancel unlock
      });
    };
  }, [checkUnlock, clearSearch, inactiveModal, notify, setStateSelectAccount]);

  const onSubmitAccount = useCallback((name: string) => {
      if(accountSelected) {
        setSelected(accountSelected.id);
        setTimeout(() => {
          deriveAccountV3({
            proxyId: accountSelected.id,
            name,
            suri: accountSelected.suri
          }).then(() => {
            inactiveModal(modalId);
            setStateSelectAccount(true);
            clearSearch();
          }).catch((e: Error) => {
            notify({
              message: e.message,
              type: 'error'
            });
          }).finally(() => {
            setSelected('');
            inactiveModal(accountNameModalId)
          });
        }, 500);
      }
  }, [accountSelected])

  useEffect(() => {
    if(accountSelected) {
      activeModal(accountNameModalId);
    }
  }, [accountSelected, activeModal])

  const renderItem = useCallback((account: AccountProxy): React.ReactNode => {
    const disabled = !!selected;
    const isSelected = account.id === selected;

    return (
      <React.Fragment key={account.id}>
        <AccountProxyItem
          accountProxy={account}
          className={CN({ disabled: disabled && !isSelected }, 'account-derive-item') }
          onClick={disabled ? undefined : onSelectAccount(account)}
          showUnselectIcon={false}
          renderRightPart={isSelected ? renderLoaderIcon : undefined}
        />
      </React.Fragment>
    );
  }, [onSelectAccount, selected, token.sizeLG]);

  const onBack = useSwitchModal(modalId, CREATE_ACCOUNT_MODAL, clearSearch);

  return (
    <>
      <SwModal
        className={className}
        closeIcon={(<BackIcon />)}
        id={modalId}
        maskClosable={false}
        onCancel={selected ? undefined : onBack}
        title={t('Select account')}
      >
        <SwList.Section
          displayRow={true}
          enableSearchInput={true}
          list={filtered}
          ref={sectionRef}
          renderItem={renderItem}
          renderWhenEmpty={renderEmpty}
          rowGap='var(--row-gap)'
          searchFunction={searchAccountFunction}
          searchPlaceholder={t<string>('Account name')}
        />
      </SwModal>

      <AccountNameModal
        onSubmit={onSubmitAccount}
        modalId={accountNameModalId}
        accountType={accountSelected?.accountType}
        isLoading={!!selected}
      />
    </>

  );
};

const DeriveAccountModal = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {
    '--row-gap': `${token.sizeXS}px`,

    '.ant-sw-modal-body': {
      padding: `${token.padding}px 0`,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    },

    '.ant-web3-block': {
      display: 'flex !important',

      '.ant-web3-block-right-item': {
        marginRight: 0,

        '.loader-icon': {
          animation: 'spinner-loading 1s infinite linear'
        }
      }
    },

    '.disabled': {
      opacity: 0.4,

      '.ant-web3-block': {
        cursor: 'not-allowed',

        '&:hover': {
          backgroundColor: token['gray-1']
        }
      }
    },

    '.account-derive-item': {
      display: 'flex'
    }
  };
});

export default DeriveAccountModal;
