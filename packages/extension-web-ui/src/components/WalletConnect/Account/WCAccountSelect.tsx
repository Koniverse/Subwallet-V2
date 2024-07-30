// Copyright 2019-2022 @subwallet/extension-web-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountJson } from '@subwallet/extension-base/background/types';
import { ALL_ACCOUNT_KEY } from '@subwallet/extension-base/constants';
import { isSameAddress } from '@subwallet/extension-base/utils';
import { AccountItemWithName, AlertBox } from '@subwallet/extension-web-ui/components';
import { BaseModal } from '@subwallet/extension-web-ui/components/Modal/BaseModal';
import { useTranslation } from '@subwallet/extension-web-ui/hooks';
import { ThemeProps } from '@subwallet/extension-web-ui/types';
import { searchAccountFunction } from '@subwallet/extension-web-ui/utils';
import { Button, Icon, ModalContext, SwList } from '@subwallet/react-ui';
import { SwListSectionRef } from '@subwallet/react-ui/es/sw-list';
import CN from 'classnames';
import { CheckCircle } from 'phosphor-react';
import React, { useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import styled from 'styled-components';

import { GeneralEmptyList } from '../../EmptyList';
import WCAccountInput from './WCAccountInput';

interface Props extends ThemeProps {
  id: string;
  namespace: string;
  selectedAccounts: string[];
  appliedAccounts: string[];
  availableAccounts: AccountJson[];
  onSelectAccount: (account: string, applyImmediately?: boolean) => VoidFunction;
  useModal: boolean;
  onApply: () => void;
  onCancel: () => void;
}

const renderEmpty = () => <GeneralEmptyList />;

const Component: React.FC<Props> = (props: Props) => {
  const { appliedAccounts, availableAccounts, className, id, namespace, onApply, onCancel, onSelectAccount, selectedAccounts, useModal } = props;

  const { t } = useTranslation();

  const { activeModal, checkActive, inactiveModal } = useContext(ModalContext);

  const sectionRef = useRef<SwListSectionRef>(null);

  const isActive = checkActive(id);

  const noAccountTitle = useMemo(() => {
    switch (namespace) {
      case 'polkadot':
        return t('settings.Screen.walletConnect.accountSelector.title.substrate');
      case 'eip155':
        return t('settings.Screen.walletConnect.accountSelector.title.evm');
      default:
        return t('settings.Screen.walletConnect.accountSelector.title.default');
    }
  }, [namespace, t]);

  const noAccountDescription = useMemo(() => {
    switch (namespace) {
      case 'polkadot':
        return t('settings.Screen.walletConnect.accountSelector.description.substrate');
      case 'eip155':
        return t('settings.Screen.walletConnect.accountSelector.description.evm');
      default:
        return t('settings.Screen.walletConnect.accountSelector.description.default');
    }
  }, [namespace, t]);

  const onOpenModal = useCallback(() => {
    activeModal(id);
  }, [activeModal, id]);

  const onCloseModal = useCallback(() => {
    inactiveModal(id);
    onCancel();
  }, [inactiveModal, id, onCancel]);

  const _onApply = useCallback(() => {
    inactiveModal(id);
    onApply();
  }, [id, inactiveModal, onApply]);

  const renderItem = useCallback((item: AccountJson) => {
    const selected = !!selectedAccounts.find((address) => isSameAddress(address, item.address));

    return (
      <AccountItemWithName
        accountName={item.name}
        address={item.address}
        avatarSize={24}
        direction='horizontal'
        isSelected={selected}
        key={item.address}
        onClick={onSelectAccount(item.address, false)}
        showUnselectIcon={true}
      />
    );
  }, [onSelectAccount, selectedAccounts]);

  useEffect(() => {
    if (!isActive) {
      sectionRef.current?.setSearchValue('');
    }
  }, [isActive]);

  return (
    <div className={CN(className)}>
      {
        !availableAccounts.length
          ? (
            <AlertBox
              description={noAccountDescription}
              title={noAccountTitle}
              type='warning'
            />
          )
          : useModal
            ? (
              <>
                <WCAccountInput
                  accounts={availableAccounts}
                  onClick={onOpenModal}
                  selected={appliedAccounts}
                />
                <BaseModal
                  className={CN(className, 'account-modal')}
                  footer={(
                    <Button
                      block
                      disabled={!selectedAccounts.length}
                      icon={(
                        <Icon
                          phosphorIcon={CheckCircle}
                          weight={'fill'}
                        />
                      )}
                      onClick={_onApply}
                    >
                      {t('settings.Screen.walletConnect.accountSelector.Button.apply', { replace: { number: selectedAccounts.length } })}
                    </Button>
                  )}
                  id={id}
                  onCancel={onCloseModal}
                  title={t('settings.Screen.walletConnect.accountSelector.title')}
                >
                  <SwList.Section
                    className='account-list'
                    displayRow
                    enableSearchInput={true}
                    list={availableAccounts}
                    ref={sectionRef}
                    renderItem={renderItem}
                    renderWhenEmpty={renderEmpty}
                    rowGap='var(--row-gap)'
                    searchFunction={searchAccountFunction}
                    searchMinCharactersCount={2}
                    searchPlaceholder={t<string>('settings.Screen.walletConnect.accountSelector.searchPlaceHolder')}
                  />
                </BaseModal>
              </>
            )
            : (
              <>
                <div className={CN('account-list', 'no-modal')}>
                  {availableAccounts.length > 1 && (
                    <AccountItemWithName
                      accountName={'Select all accounts'}
                      accounts={availableAccounts}
                      address={ALL_ACCOUNT_KEY}
                      avatarSize={24}
                      isSelected={selectedAccounts.length === availableAccounts.length}
                      onClick={onSelectAccount(ALL_ACCOUNT_KEY, true)}
                      showUnselectIcon
                    />
                  )}
                  {availableAccounts.map((item) => {
                    const selected = !!selectedAccounts.find((address) => isSameAddress(address, item.address));

                    return (
                      <AccountItemWithName
                        accountName={item.name}
                        address={item.address}
                        avatarSize={24}
                        isSelected={selected}
                        key={item.address}
                        onClick={onSelectAccount(item.address, true)}
                        showUnselectIcon
                      />
                    );
                  })}
                </div>
                <div className={CN(className, 'additional-content')}>
                  {t('settings.Screen.walletConnect.accountSelector.additionalContent')}
                </div>
              </>
            )
      }
    </div>
  );
};

const WCAccountSelect = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {
    '--row-gap': `${token.sizeXS}px`,

    '.account-list.no-modal': {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--row-gap)'
    },

    '&.account-modal': {
      '.ant-sw-modal-body': {
        padding: `${token.padding}px 0 ${token.padding}px`,
        flexDirection: 'column',
        display: 'flex'
      }
    },

    '.additional-content': {
      padding: token.padding,
      paddingBottom: 0,
      fontSize: token.fontSizeHeading6,
      lineHeight: token.lineHeightHeading6,
      textAlign: 'center',
      color: token.colorTextTertiary
    }
  };
});

export default WCAccountSelect;
