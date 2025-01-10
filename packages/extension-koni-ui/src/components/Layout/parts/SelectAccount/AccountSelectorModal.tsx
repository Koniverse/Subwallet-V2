// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { ButtonProps } from '@subwallet/react-ui/es/button/button';

import { CurrentAccountInfo } from '@subwallet/extension-base/background/types';
import { AccountActions, AccountProxy, AccountProxyType } from '@subwallet/extension-base/types';
import { AccountChainAddressesModal, AccountProxySelectorAllItem, AccountProxySelectorItem, GeneralEmptyList } from '@subwallet/extension-koni-ui/components';
import ExportAllSelector from '@subwallet/extension-koni-ui/components/Layout/parts/SelectAccount/ExportAllSelector';
import SelectAccountFooter from '@subwallet/extension-koni-ui/components/Layout/parts/SelectAccount/Footer';
import Search from '@subwallet/extension-koni-ui/components/Search';
import { ACCOUNT_CHAIN_ADDRESSES_MODAL, SELECT_ACCOUNT_MODAL } from '@subwallet/extension-koni-ui/constants/modal';
import { useDefaultNavigate, useIsPopup, useSetSessionLatest } from '@subwallet/extension-koni-ui/hooks';
import useTranslation from '@subwallet/extension-koni-ui/hooks/common/useTranslation';
import { saveCurrentAccountAddress } from '@subwallet/extension-koni-ui/messaging';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import { Theme } from '@subwallet/extension-koni-ui/themes';
import { AccountDetailParam, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { isAccountAll } from '@subwallet/extension-koni-ui/utils';
import { Button, Icon, ModalContext, SwList, SwModal, Tooltip } from '@subwallet/react-ui';
import CN from 'classnames';
import { Circle, Export, Gear } from 'phosphor-react';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import styled, { useTheme } from 'styled-components';

type ListItemGroupLabel = {
  id: string;
  groupLabel: string;
}

type ListItem = AccountProxy | ListItemGroupLabel;

const enableExtraction = true;

type Props = ThemeProps;

function reorderAccounts (items: AccountProxy[]): AccountProxy[] {
  const accountMap: Record<string, AccountProxy> = {};
  const allChildren = new Set<string>();
  const result: AccountProxy[] = [];

  items.forEach((item) => {
    accountMap[item.id] = item;

    if (item.children) {
      item.children.forEach((childId) => allChildren.add(childId));
    }
  });

  items.forEach((item) => {
    if (!allChildren.has(item.id)) {
      addWithChildren(item);
    }
  });

  function addWithChildren (item: AccountProxy) {
    result.push(item);

    if (item.children) {
      item.children.forEach((childId) => {
        const child = accountMap[childId];

        if (child) {
          addWithChildren(child);
        }
      });
    }
  }

  return result;
}

const renderEmpty = () => <GeneralEmptyList />;
const multiExportAccountModalId = 'multi-export-account-selector';
const modalId = SELECT_ACCOUNT_MODAL;
const accountChainAddressesModalId = ACCOUNT_CHAIN_ADDRESSES_MODAL;
const defaultSearchInputRenderKey = 'search-input-render-key';

const Component: React.FC<Props> = ({ className }: Props) => {
  const location = useLocation();
  const { t } = useTranslation();
  const { activeModal, checkActive, inactiveModal } = useContext(ModalContext);
  const [searchValue, setSearchValue] = useState<string>('');
  const { token } = useTheme() as Theme;
  const { goHome } = useDefaultNavigate();
  const navigate = useNavigate();
  const { setStateSelectAccount } = useSetSessionLatest();
  const isModalVisible = useMemo(() => checkActive(modalId), [checkActive]);
  const isPopup = useIsPopup();

  const accountProxies = useSelector((state: RootState) => state.accountState.accountProxies);
  const currentAccountProxy = useSelector((state: RootState) => state.accountState.currentAccountProxy);

  const [selectedAccountProxy, setSelectedAccountProxy] = useState<{ name?: string; proxyId?: string } | undefined>();
  const [searchInputRenderKey, setSearchInputRenderKey] = useState<string>(defaultSearchInputRenderKey);
  const accountProxyToGetAddresses = useMemo(() => {
    if (!selectedAccountProxy) {
      return undefined;
    }

    return accountProxies.find((ap) => ap.id === selectedAccountProxy.proxyId);
  }, [accountProxies, selectedAccountProxy]);

  const listItems = useMemo<ListItem[]>(() => {
    let accountAll: AccountProxy | undefined;
    const result: ListItem[] = [];
    const masterAccounts: AccountProxy[] = [];
    const qrSignerAccounts: ListItem[] = [];
    const watchOnlyAccounts: ListItem[] = [];
    const ledgerAccounts: ListItem[] = [];
    const injectedAccounts: ListItem[] = [];
    const unknownAccounts: ListItem[] = [];

    accountProxies.forEach((ap) => {
      if (searchValue) {
        const isValidSearchByAddress = ap.accounts.some((acc) => acc.address.toLowerCase().includes(searchValue.toLowerCase()));

        if (!ap.name.toLowerCase().includes(searchValue.toLowerCase()) && !isValidSearchByAddress) {
          return;
        }
      } else if (isAccountAll(ap.id) || ap.accountType === AccountProxyType.ALL_ACCOUNT) {
        accountAll = ap;

        return;
      }

      if (ap.accountType === AccountProxyType.SOLO || ap.accountType === AccountProxyType.UNIFIED) {
        masterAccounts.push(ap);
      } else if (ap.accountType === AccountProxyType.QR) {
        qrSignerAccounts.push(ap);
      } else if (ap.accountType === AccountProxyType.READ_ONLY) {
        watchOnlyAccounts.push(ap);
      } else if (ap.accountType === AccountProxyType.LEDGER) {
        ledgerAccounts.push(ap);
      } else if (ap.accountType === AccountProxyType.INJECTED) {
        injectedAccounts.push(ap);
      } else if (ap.accountType === AccountProxyType.UNKNOWN) {
        unknownAccounts.push(ap);
      }
    });

    if (masterAccounts.length) {
      result.push(...reorderAccounts(masterAccounts));
    }

    if (qrSignerAccounts.length) {
      qrSignerAccounts.unshift({
        id: 'qr',
        groupLabel: t('QR signer account')
      });

      result.push(...qrSignerAccounts);
    }

    if (watchOnlyAccounts.length) {
      watchOnlyAccounts.unshift({
        id: 'watch-only',
        groupLabel: t('Watch-only account')
      });

      result.push(...watchOnlyAccounts);
    }

    if (ledgerAccounts.length) {
      ledgerAccounts.unshift({
        id: 'ledger',
        groupLabel: t('Ledger account')
      });

      result.push(...ledgerAccounts);
    }

    if (injectedAccounts.length) {
      injectedAccounts.unshift({
        id: 'injected',
        groupLabel: t('Injected account')
      });

      result.push(...ledgerAccounts);
    }

    if (unknownAccounts.length) {
      unknownAccounts.unshift({
        id: 'unknown',
        groupLabel: t('Unknown account')
      });

      result.push(...unknownAccounts);
    }

    if (result.length && accountAll) {
      result.unshift(accountAll);
    }

    return result;
  }, [accountProxies, searchValue, t]);

  const hasSearchValue = !!searchValue;

  const showAllAccount = useMemo(() => {
    return !hasSearchValue && accountProxies.filter(({ id }) => !isAccountAll(id)).length > 1;
  }, [hasSearchValue, accountProxies]);

  const onSelect = useCallback((accountProxy: AccountProxy) => {
    return () => {
      const targetAccountProxy = accountProxies.find((ap) => ap.id === accountProxy.id);

      if (targetAccountProxy) {
        const accountInfo = {
          address: targetAccountProxy.id
        } as CurrentAccountInfo;

        saveCurrentAccountAddress(accountInfo).then(() => {
          const pathName = location.pathname;
          const locationPaths = location.pathname.split('/');

          if (locationPaths) {
            if (locationPaths[1] === 'home') {
              if (locationPaths.length >= 3) {
                if (pathName.startsWith('/home/nfts')) {
                  navigate('/home/nfts/collections');
                } else if (pathName.startsWith('/home/tokens/detail')) {
                  navigate('/home/tokens');
                } else {
                  navigate(`/home/${locationPaths[2]}`);
                }
              }
            } else {
              goHome();
            }
          }
        }).catch((e) => {
          console.error('Failed to switch account', e);
        });
      } else {
        console.error('Failed to switch account');
      }

      inactiveModal(modalId);
      setSearchValue('');
    };
  }, [accountProxies, inactiveModal, location.pathname, navigate, goHome]);

  const onViewChainAddresses = useCallback((accountProxy: AccountProxy) => {
    return () => {
      setSelectedAccountProxy({ name: accountProxy.name, proxyId: accountProxy.id });
      setTimeout(() => {
        activeModal(accountChainAddressesModalId);
      }, 100);
    };
  }, [activeModal]);

  const onViewAccountDetail = useCallback((accountProxy: AccountProxy, requestViewDerivedAccounts?: boolean) => {
    return () => {
      inactiveModal(modalId);
      setTimeout(() => {
        navigate(`/accounts/detail/${accountProxy.id}`, {
          state: {
            requestViewDerivedAccounts: requestViewDerivedAccounts,
            requestViewDerivedAccountDetails: false
          } as AccountDetailParam
        });
      }, 100);
    };
  }, [inactiveModal, navigate]);

  const renderItem = useCallback((item: ListItem): React.ReactNode => {
    if ((item as ListItemGroupLabel).groupLabel) {
      return (
        <div
          className={'list-item-group-label'}
          key={item.id}
        >
          {(item as ListItemGroupLabel).groupLabel}
        </div>
      );
    }

    const currentAccountIsAll = isAccountAll(item.id);

    if (currentAccountIsAll) {
      if (showAllAccount) {
        return (
          <AccountProxySelectorAllItem
            className='all-account-selection'
            isSelected={item.id === currentAccountProxy?.id}
            key={item.id}
            onClick={onSelect(item as AccountProxy)}
          />
        );
      } else {
        return null;
      }
    }

    return (
      <AccountProxySelectorItem
        accountProxy={item as AccountProxy}
        className='account-selection'
        isSelected={item.id === currentAccountProxy?.id}
        key={item.id}
        onClick={onSelect(item as AccountProxy)}
        onClickCopyButton={onViewChainAddresses(item as AccountProxy)}
        onClickDeriveButton={onViewAccountDetail(item as AccountProxy, true)}
        onClickMoreButton={onViewAccountDetail(item as AccountProxy)}
      />
    );
  }, [currentAccountProxy?.id, onSelect, onViewAccountDetail, onViewChainAddresses, showAllAccount]);

  const handleSearch = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  const _onCancel = useCallback(() => {
    inactiveModal(modalId);
    setSearchValue('');
    setStateSelectAccount(true);
  }, [inactiveModal, setStateSelectAccount]);

  const exportAllAccounts = useCallback(() => {
    activeModal(multiExportAccountModalId);
  }, [activeModal]);

  useEffect(() => {
    const selectedAccount = accountProxies.find((account) => account.name === selectedAccountProxy?.name);
    const isSoloAccount = selectedAccount?.accountType === AccountProxyType.SOLO;
    const hasTonChangeWalletContractVersion = selectedAccount?.accountActions.includes(AccountActions.TON_CHANGE_WALLET_CONTRACT_VERSION);

    if (isSoloAccount && hasTonChangeWalletContractVersion) {
      setSelectedAccountProxy({ name: selectedAccount?.name, proxyId: selectedAccount?.id });
    }
  }, [accountProxies, selectedAccountProxy?.name]);

  useEffect(() => {
    if (isModalVisible) {
      setSearchInputRenderKey(`${defaultSearchInputRenderKey}-${Date.now()}`);
    }
  }, [isModalVisible]);

  const accountSettingButtonProps = useMemo<ButtonProps>(() => {
    return {
      icon: (
        <Icon
          phosphorIcon={Gear}
        />
      ),
      type: 'ghost',
      onClick: () => {
        navigate('/settings/account-settings');
      },
      tooltip: t('Account settings'),
      tooltipPlacement: 'topRight'
    };
  }, [navigate, t]);

  const rightIconProps = useMemo((): ButtonProps | undefined => {
    if (!enableExtraction) {
      return;
    }

    return ({
      icon: (
        <Icon
          className={CN('__export-remind-btn')}
          phosphorIcon={Export}
          weight='fill'
        />
      ),
      children: (
        <Tooltip
          className={'__icon-export-remind'}
          destroyTooltipOnHide={true}
          overlayClassName={CN('__tooltip-overlay-remind')}
          placement={'bottomLeft'}
          title={t('Export and back up accounts')}
        >
          <div>
            <Icon
              customSize={'7.39px'}
              iconColor={token.colorHighlight}
              phosphorIcon={Circle}
              weight={'fill'}
            />
          </div>
        </Tooltip>
      ),
      onClick: exportAllAccounts,
      size: 'xs',
      type: 'ghost',
      tooltipPlacement: 'topLeft'
    });
  }, [exportAllAccounts, t, token.colorHighlight]);

  const closeAccountChainAddressesModal = useCallback(() => {
    inactiveModal(accountChainAddressesModalId);
    setSelectedAccountProxy(undefined);
  }, [inactiveModal]);

  const onBackAccountChainAddressesModal = useCallback(() => {
    closeAccountChainAddressesModal();
  }, [closeAccountChainAddressesModal]);

  const onCancelAccountChainAddressesModal = useCallback(() => {
    inactiveModal(modalId);
    closeAccountChainAddressesModal();
  }, [closeAccountChainAddressesModal, inactiveModal]);

  return (
    <>
      <SwModal
        className={CN(className)}
        footer={<SelectAccountFooter />}
        id={modalId}
        onCancel={_onCancel}
        rightIconProps={rightIconProps}
        title={(
          <>
            {t('Select account')}

            {isPopup && (
              <Button
                {...accountSettingButtonProps}
                className={'__account-setting-button -schema-header'}
                size={'xs'}
              />
            )}
          </>
        )}
      >
        <Search
          autoFocus={true}
          className={'__search-box'}
          key={searchInputRenderKey}
          onSearch={handleSearch}
          placeholder={t<string>('Account name')}
          searchValue={searchValue}
        />
        <SwList
          className={'__list-container'}
          list={listItems}
          renderItem={renderItem}
          renderWhenEmpty={renderEmpty}
        />
      </SwModal>

      {
        accountProxyToGetAddresses && (
          <AccountChainAddressesModal
            accountProxy={accountProxyToGetAddresses}
            onBack={onBackAccountChainAddressesModal}
            onCancel={onCancelAccountChainAddressesModal}
          />
        )
      }

      <ExportAllSelector
        items={accountProxies}
      />
    </>
  );
};

export const AccountSelectorModal = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {
    '.ant-sw-header-center-part': {
      position: 'relative',
      height: 40
    },

    '.ant-sw-sub-header-title': {
      fontSize: token.fontSizeXL,
      lineHeight: token.lineHeightHeading4,
      fontWeight: token.fontWeightStrong
    },

    '.ant-sw-header-center-part .__account-setting-button': {
      position: 'absolute',
      right: 0,
      top: 0
    },

    '.ant-sw-modal-content': {
      height: '100vh'
    },

    '.ant-sw-modal-body': {
      overflow: 'auto',
      display: 'flex',
      flex: 1,
      flexDirection: 'column',
      paddingBottom: 0
    },

    '.ant-sw-modal-footer.ant-sw-modal-footer': {
      borderTop: 0
    },

    '.list-item-group-label': {
      textTransform: 'uppercase',
      fontSize: 11,
      lineHeight: '18px',
      fontWeight: token.headingFontWeight,
      color: token.colorTextLight3
    },

    '.__search-box': {
      marginBottom: token.marginXS
    },

    '.__list-container': {
      flex: 1,
      overflow: 'auto',

      '> div + div': {
        marginTop: token.marginXS
      }
    },

    '.__icon-export-remind': {
      position: 'absolute',
      top: '-35%',
      left: '40%'
    },

    '.anticon.__export-remind-btn': {
      height: 23,
      width: 24
    }
  };
});
