// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountProxyType } from '@subwallet/extension-base/types';
import { AddressSelectorItem, CloseIcon } from '@subwallet/extension-koni-ui/components';
import GeneralEmptyList from '@subwallet/extension-koni-ui/components/EmptyList/GeneralEmptyList';
import Search from '@subwallet/extension-koni-ui/components/Search';
import { useTranslation } from '@subwallet/extension-koni-ui/hooks';
import { AccountAddressItemType, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { Icon, ModalContext, SwList, SwModal } from '@subwallet/react-ui';
import CN from 'classnames';
import { CaretLeft } from 'phosphor-react';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

type ListItemGroupLabel = {
  id: string;
  groupLabel: string;
}

type ListItem = AccountAddressItemType | ListItemGroupLabel;

interface Props extends ThemeProps {
  modalId: string;
  onSelectItem?: (item: AccountAddressItemType) => void,
  items: AccountAddressItemType[];
  onCancel?: VoidFunction;
  onBack?: VoidFunction;
  selectedValue?: string;
}

const renderEmpty = () => <GeneralEmptyList />;

function Component ({ className = '', items, modalId, onBack, onCancel, onSelectItem, selectedValue }: Props): React.ReactElement<Props> {
  const { t } = useTranslation();
  const { checkActive } = useContext(ModalContext);

  const [searchValue, setSearchValue] = useState<string>('');

  const isActive = checkActive(modalId);

  const searchFunction = useCallback((item: AccountAddressItemType, searchText: string) => {
    const lowerCaseSearchText = searchText.toLowerCase();

    return item.accountName.toLowerCase().includes(lowerCaseSearchText) ||
      item.address.toLowerCase().includes(lowerCaseSearchText);
  }, []);

  const onSelect = useCallback((item: AccountAddressItemType) => {
    return () => {
      onSelectItem?.(item);
    };
  }, [onSelectItem]);

  const renderItem = useCallback((item: ListItem) => {
    if ((item as ListItemGroupLabel).groupLabel) {
      return (
        <div
          className={'list-item-group-label'}
          key={(item as ListItemGroupLabel).id}
        >
          {(item as ListItemGroupLabel).groupLabel}
        </div>
      );
    }

    return (
      <AddressSelectorItem
        address={(item as AccountAddressItemType).address}
        avatarValue={(item as AccountAddressItemType).accountProxyId}
        className={'account-selector-item'}
        isSelected={selectedValue === (item as AccountAddressItemType).address}
        key={(item as AccountAddressItemType).address}
        name={(item as AccountAddressItemType).accountName}
        onClick={onSelect(item as AccountAddressItemType)}
      />
    );
  }, [onSelect, selectedValue]);

  const listItems = useMemo<ListItem[]>(() => {
    const result: ListItem[] = [];
    const masterAccounts: AccountAddressItemType[] = [];
    const qrSignerAccounts: ListItem[] = [];
    const watchOnlyAccounts: ListItem[] = [];
    const ledgerAccounts: ListItem[] = [];
    const injectedAccounts: ListItem[] = [];
    const unknownAccounts: ListItem[] = [];

    items.forEach((item) => {
      if (searchValue && !searchFunction(item, searchValue)) {
        return;
      }

      if (item.accountProxyType === AccountProxyType.SOLO || item.accountProxyType === AccountProxyType.UNIFIED) {
        masterAccounts.push(item);
      } else if (item.accountProxyType === AccountProxyType.QR) {
        qrSignerAccounts.push(item);
      } else if (item.accountProxyType === AccountProxyType.READ_ONLY) {
        watchOnlyAccounts.push(item);
      } else if (item.accountProxyType === AccountProxyType.LEDGER) {
        ledgerAccounts.push(item);
      } else if (item.accountProxyType === AccountProxyType.INJECTED) {
        injectedAccounts.push(item);
      } else if (item.accountProxyType === AccountProxyType.UNKNOWN) {
        unknownAccounts.push(item);
      }
    });

    if (masterAccounts.length) {
      result.push(...masterAccounts);
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

    return result;
  }, [items, searchFunction, searchValue, t]);

  const handleSearch = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  useEffect(() => {
    if (!isActive) {
      setTimeout(() => {
        setSearchValue('');
      }, 100);
    }
  }, [isActive]);

  return (
    <SwModal
      className={CN(className)}
      closeIcon={
        onBack
          ? (
            <Icon
              phosphorIcon={CaretLeft}
              size='md'
            />
          )
          : undefined
      }
      destroyOnClose={true}
      id={modalId}
      onCancel={onBack || onCancel}
      rightIconProps={onBack
        ? {
          icon: <CloseIcon />,
          onClick: onCancel
        }
        : undefined}
      title={t('Select account')}
    >
      <Search
        autoFocus={true}
        className={'__search-box'}
        onSearch={handleSearch}
        placeholder={t<string>('Enter your account name or address')}
        searchValue={searchValue}
      />
      <SwList
        className={'__list-container'}
        list={listItems}
        renderItem={renderItem}
        renderWhenEmpty={renderEmpty}
      />
    </SwModal>
  );
}

const AccountSelectorModal = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return ({
    '.ant-sw-modal-content': {
      height: '100vh'
    },

    '.ant-sw-modal-body': {
      overflow: 'auto',
      display: 'flex',
      flex: 1,
      flexDirection: 'column'
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

    '.account-selector-item + .account-selector-item': {
      marginTop: token.marginXS
    }
  });
});

export default AccountSelectorModal;
