// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { BackIcon } from '@subwallet/extension-koni-ui/components';
import { useChainInfo, useFilterModal, useSelector } from '@subwallet/extension-koni-ui/hooks';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import { getReformatedAddressRelatedToNetwork, isAccountAll, reformatAddress } from '@subwallet/extension-koni-ui/utils';
import { Badge, Icon, ModalContext, SwList, SwModal } from '@subwallet/react-ui';
import { SwListSectionRef } from '@subwallet/react-ui/es/sw-list';
import CN from 'classnames';
import { FadersHorizontal } from 'phosphor-react';
import React, { useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import { isAddress } from '@polkadot/util-crypto';

import { AccountItemWithName } from '../../Account';
import { GeneralEmptyList } from '../../EmptyList';
import { FilterModal } from '../FilterModal';

interface Props extends ThemeProps {
  value?: string;
  id: string;
  chainSlug?: string;
  onSelect: (val: string) => void;
}

enum AccountGroup {
  WALLET = 'wallet',
  CONTACT = 'contact',
  RECENT = 'recent'
}

interface FilterOption {
  label: string;
  value: AccountGroup;
}

interface AccountItem {
  address: string;
  name?: string;
  group: AccountGroup;
}

const renderEmpty = () => <GeneralEmptyList />;

const getGroupPriority = (item: AccountItem): number => {
  switch (item.group) {
    case AccountGroup.WALLET:
      return 2;
    case AccountGroup.CONTACT:
      return 1;
    case AccountGroup.RECENT:
    default:
      return 0;
  }
};

const Component: React.FC<Props> = (props: Props) => {
  const { chainSlug, className, id, onSelect, value = '' } = props;

  const { t } = useTranslation();

  const { activeModal, checkActive, inactiveModal } = useContext(ModalContext);

  const isActive = checkActive(id);

  const { accountProxies, contacts, recent } = useSelector((state) => state.accountState);

  const chainInfo = useChainInfo(chainSlug);

  const filterModal = useMemo(() => `${id}-filter-modal`, [id]);

  const { filterSelectionMap, onApplyFilter, onChangeFilterOption, onCloseFilterModal, onResetFilter, selectedFilters } = useFilterModal(filterModal);

  const sectionRef = useRef<SwListSectionRef>(null);

  const filterOptions: FilterOption[] = useMemo(() => ([
    {
      label: t('Your wallet'),
      value: AccountGroup.WALLET
    },
    {
      label: t('Saved contacts'),
      value: AccountGroup.CONTACT
    },
    {
      label: t('Recent'),
      value: AccountGroup.RECENT
    }
  ]), [t]);

  const items = useMemo((): AccountItem[] => {
    const result: AccountItem[] = [];

    (!selectedFilters.length || selectedFilters.includes(AccountGroup.RECENT)) && recent.forEach((acc) => {
      const chains = acc.recentChainSlugs || [];

      if (chainSlug && chains.includes(chainSlug)) {
        const address = isAddress(acc.address) ? reformatAddress(acc.address) : acc.address;

        result.push({ name: acc.name, address: address, group: AccountGroup.RECENT });
      }
    });

    (!selectedFilters.length || selectedFilters.includes(AccountGroup.CONTACT)) && contacts.forEach((acc) => {
      const address = isAddress(acc.address) ? reformatAddress(acc.address) : acc.address;

      result.push({ name: acc.name, address: address, group: AccountGroup.CONTACT });
    });

    (!selectedFilters.length || selectedFilters.includes(AccountGroup.WALLET)) && chainInfo && accountProxies.forEach((ap) => {
      if (isAccountAll(ap.id)) {
        return;
      }

      // todo: recheck with ledger

      ap.accounts.forEach((a) => {
        const address = getReformatedAddressRelatedToNetwork(a, chainInfo);

        if (address) {
          result.push({ name: ap.name, address: address, group: AccountGroup.WALLET });
        }
      });
    });

    // todo: may need better solution for this sorting below

    return result
      .sort((a: AccountItem, b: AccountItem) => {
        return ((a?.name || '').toLowerCase() > (b?.name || '').toLowerCase()) ? 1 : -1;
      })
      .sort((a, b) => getGroupPriority(b) - getGroupPriority(a));
  }, [accountProxies, chainInfo, chainSlug, contacts, recent, selectedFilters]);

  const searchFunction = useCallback((item: AccountItem, searchText: string) => {
    const searchTextLowerCase = searchText.toLowerCase();

    return (
      item.address.toLowerCase().includes(searchTextLowerCase) ||
      (item.name
        ? item.name.toLowerCase().includes(searchTextLowerCase)
        : false)
    );
  }, []);

  const onClose = useCallback(() => {
    inactiveModal(id);
    onResetFilter();
  }, [id, inactiveModal, onResetFilter]);

  const onSelectItem = useCallback((item: AccountItem) => {
    return () => {
      inactiveModal(id);
      onSelect(item.address);
      onResetFilter();
    };
  }, [id, inactiveModal, onResetFilter, onSelect]);

  const renderItem = useCallback((item: AccountItem) => {
    const address = item.address;
    const isRecent = item.group === AccountGroup.RECENT;

    return (
      <AccountItemWithName
        accountName={item.name}
        address={address}
        addressPreLength={isRecent ? 9 : 4}
        addressSufLength={isRecent ? 9 : 4}
        avatarSize={24}
        fallbackName={false}
        isSelected={value.toLowerCase() === address.toLowerCase()}
        key={`${item.address}_${item.group}`}
        onClick={onSelectItem(item)}
      />
    );
  }, [onSelectItem, value]);

  const groupSeparator = useCallback((group: AccountItem[], idx: number, groupKey: string) => {
    const _group = groupKey as AccountGroup;

    let groupLabel = _group;

    switch (_group) {
      case AccountGroup.WALLET:
        groupLabel = t('Your wallet');
        break;
      case AccountGroup.CONTACT:
        groupLabel = t('Saved contacts');
        break;
      case AccountGroup.RECENT:
        groupLabel = t('Recent');
        break;
    }

    return (
      <div className='address-book-group-separator'>
        <span className='address-book-group-label'>{groupLabel}</span>
        <span className='address-book-group-counter'>&nbsp;({group.length})</span>
      </div>
    );
  }, [t]);

  const openFilter = useCallback(() => {
    activeModal(filterModal);
  }, [activeModal, filterModal]);

  const applyFilter = useCallback(() => {
    onApplyFilter();
    activeModal(id);
  }, [activeModal, id, onApplyFilter]);

  const cancelFilter = useCallback(() => {
    onCloseFilterModal();
    activeModal(id);
  }, [activeModal, id, onCloseFilterModal]);

  useEffect(() => {
    if (!isActive) {
      setTimeout(() => {
        sectionRef.current?.setSearchValue('');
      }, 100);
    }
  }, [isActive, sectionRef]);

  return (
    <>
      <SwModal
        className={CN(className)}
        id={id}
        onCancel={onClose}
        title={t('Address book')}
      >
        <SwList.Section
          actionBtnIcon={(
            <Badge dot={!!selectedFilters.length}>
              <Icon
                phosphorIcon={FadersHorizontal}
                size='sm'
                type='phosphor'
                weight='fill'
              />
            </Badge>
          )}
          displayRow={true}
          enableSearchInput={true}
          groupBy='group'
          groupSeparator={groupSeparator}
          list={items}
          onClickActionBtn={openFilter}
          ref={sectionRef}
          renderItem={renderItem}
          renderWhenEmpty={renderEmpty}
          rowGap='var(--row-gap)'
          searchFunction={searchFunction}
          searchMinCharactersCount={2}
          searchPlaceholder={t<string>('Account name')}
          showActionBtn={true}
        />
      </SwModal>
      <FilterModal
        closeIcon={<BackIcon />}
        id={filterModal}
        onApplyFilter={applyFilter}
        onCancel={cancelFilter}
        onChangeOption={onChangeFilterOption}
        optionSelectionMap={filterSelectionMap}
        options={filterOptions}
        title={t('Filter address')}
      />
    </>
  );
};

const AddressBookModal = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {
    '--row-gap': `${token.sizeXS}px`,

    '.ant-sw-modal-body': {
      display: 'flex',
      paddingLeft: 0,
      paddingRight: 0
    },

    '.ant-sw-list-section': {
      flex: 1
    },

    '.address-book-group-separator': {
      fontWeight: token.fontWeightStrong,
      fontSize: 11,
      lineHeight: '20px',
      textTransform: 'uppercase',

      '.address-book-group-label': {
        color: token.colorTextBase
      },

      '.address-book-group-counter': {
        color: token.colorTextTertiary
      }
    }
  };
});

export default AddressBookModal;
