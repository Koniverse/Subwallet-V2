// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountActions, AccountProxy } from '@subwallet/extension-base/types';
import { AccountProxyItem } from '@subwallet/extension-koni-ui/components';
import BackIcon from '@subwallet/extension-koni-ui/components/Icon/BackIcon';
import { CREATE_ACCOUNT_MODAL, DERIVE_ACCOUNT_LIST_MODAL } from '@subwallet/extension-koni-ui/constants';
import { WalletModalContext } from '@subwallet/extension-koni-ui/contexts/WalletModalContextProvider';
import { useSwitchModal, useTranslation } from '@subwallet/extension-koni-ui/hooks';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import { searchAccountProxyFunction } from '@subwallet/extension-koni-ui/utils';
import { ModalContext, SwList, SwModal } from '@subwallet/react-ui';
import { SwListSectionRef } from '@subwallet/react-ui/es/sw-list';
import CN from 'classnames';
import React, { useCallback, useContext, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';

import { GeneralEmptyList } from '../../EmptyList';

type Props = ThemeProps;

const modalId = DERIVE_ACCOUNT_LIST_MODAL;
const renderEmpty = () => <GeneralEmptyList />;

const Component: React.FC<Props> = ({ className }: Props) => {
  const { t } = useTranslation();
  const sectionRef = useRef<SwListSectionRef>(null);

  const { deriveModal: { open: openDerive } } = useContext(WalletModalContext);
  const { inactiveModal } = useContext(ModalContext);

  const accountProxies = useSelector((state: RootState) => state.accountState.accountProxies);

  const filtered = useMemo(
    () => accountProxies
      .filter(({ accountActions }) => accountActions.includes(AccountActions.DERIVE)),
    [accountProxies]
  );

  const clearSearch = useCallback(() => {
    sectionRef.current?.setSearchValue('');
  }, []);

  const onSelectAccount = useCallback((account: AccountProxy): () => void => {
    return () => {
      openDerive({
        proxyId: account.id,
        onCompleteCb: () => {
          inactiveModal(modalId);
          clearSearch();
        }
      });
    };
  }, [clearSearch, inactiveModal, openDerive]);

  const renderItem = useCallback((account: AccountProxy): React.ReactNode => {
    return (
      <React.Fragment key={account.id}>
        <AccountProxyItem
          accountProxy={account}
          className={CN('__account-derive-item') }
          onClick={onSelectAccount(account)}
          showUnselectIcon={false}
        />
      </React.Fragment>
    );
  }, [onSelectAccount]);

  const onBack = useSwitchModal(modalId, CREATE_ACCOUNT_MODAL, clearSearch);

  return (
    <>
      <SwModal
        className={className}
        closeIcon={(<BackIcon />)}
        id={modalId}
        maskClosable={true}
        onCancel={onBack}
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
          searchFunction={searchAccountProxyFunction}
          searchPlaceholder={t<string>('Account name')}
        />
      </SwModal>
    </>
  );
};

const DeriveAccountListModal = styled(Component)<Props>(({ theme: { token } }: Props) => {
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

    '.__account-derive-item': {
      display: 'flex !important'
    }
  };
});

export default DeriveAccountListModal;
