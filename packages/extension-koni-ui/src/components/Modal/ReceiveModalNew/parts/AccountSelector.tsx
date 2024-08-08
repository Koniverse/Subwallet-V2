// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountAddressItem, CloseIcon } from '@subwallet/extension-koni-ui/components';
import GeneralEmptyList from '@subwallet/extension-koni-ui/components/EmptyList/GeneralEmptyList';
import { RECEIVE_MODAL_ACCOUNT_SELECTOR } from '@subwallet/extension-koni-ui/constants';
import { useTranslation } from '@subwallet/extension-koni-ui/hooks';
import { AccountAddressItemType, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { Icon, ModalContext, SwList, SwModal } from '@subwallet/react-ui';
import { SwListSectionRef } from '@subwallet/react-ui/es/sw-list';
import CN from 'classnames';
import { CaretLeft } from 'phosphor-react';
import React, { useCallback, useContext, useEffect, useRef } from 'react';
import styled from 'styled-components';

interface Props extends ThemeProps {
  onSelectItem?: (item: AccountAddressItemType) => void,
  items: AccountAddressItemType[];
  onCancel?: VoidFunction;
  onBack?: VoidFunction;
}

const modalId = RECEIVE_MODAL_ACCOUNT_SELECTOR;

const renderEmpty = () => <GeneralEmptyList />;

function Component ({ className = '', items, onBack, onCancel, onSelectItem }: Props): React.ReactElement<Props> {
  const { t } = useTranslation();
  const { checkActive } = useContext(ModalContext);

  const isActive = checkActive(modalId);

  const sectionRef = useRef<SwListSectionRef>(null);

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

  const renderItem = useCallback((item: AccountAddressItemType) => {
    return (
      <AccountAddressItem
        item={item}
        key={item.address}
        onClick={onSelect(item)}
      />
    );
  }, [onSelect]);

  useEffect(() => {
    if (!isActive) {
      setTimeout(() => {
        sectionRef.current?.setSearchValue('');
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
      <SwList.Section
        enableSearchInput={true}
        list={items}
        ref={sectionRef}
        renderItem={renderItem}
        renderWhenEmpty={renderEmpty}
        searchFunction={searchFunction}
        searchMinCharactersCount={2}
        searchPlaceholder={t<string>('Enter your account name or address')}
      />
    </SwModal>
  );
}

export const AccountSelectorModal = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return ({

  });
});
