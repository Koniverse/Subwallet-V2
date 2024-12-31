// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AnalyzeAddress, AnalyzedGroup } from '@subwallet/extension-base/types';
import { _reformatAddressWithChain, getAccountChainTypeForAddress } from '@subwallet/extension-base/utils';
import { AddressSelectorItem, BackIcon } from '@subwallet/extension-koni-ui/components';
import { useChainInfo, useFilterModal, useSelector } from '@subwallet/extension-koni-ui/hooks';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import { getReformatedAddressRelatedToChain, isAccountAll, isChainInfoAccordantAccountChainType } from '@subwallet/extension-koni-ui/utils';
import { Badge, Icon, ModalContext, SwList, SwModal } from '@subwallet/react-ui';
import { SwListSectionRef } from '@subwallet/react-ui/es/sw-list';
import CN from 'classnames';
import { FadersHorizontal } from 'phosphor-react';
import React, { useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import { GeneralEmptyList } from '../../EmptyList';
import { FilterModal } from '../FilterModal';

interface Props extends ThemeProps {
  value?: string;
  id: string;
  chainSlug?: string;
  onSelect: (val: string, item: AnalyzeAddress) => void;
}

interface FilterOption {
  label: string;
  value: AnalyzedGroup;
}

const renderEmpty = () => <GeneralEmptyList />;

const getGroupPriority = (item: AnalyzeAddress): number => {
  switch (item.analyzedGroup) {
    case AnalyzedGroup.WALLET:
      return 2;
    case AnalyzedGroup.CONTACT:
      return 1;
    case AnalyzedGroup.RECENT:
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
      value: AnalyzedGroup.WALLET
    },
    {
      label: t('Saved contacts'),
      value: AnalyzedGroup.CONTACT
    },
    {
      label: t('Recent'),
      value: AnalyzedGroup.RECENT
    }
  ]), [t]);

  const items = useMemo((): AnalyzeAddress[] => {
    if (!chainInfo) {
      return [];
    }

    const result: AnalyzeAddress[] = [];

    (!selectedFilters.length || selectedFilters.includes(AnalyzedGroup.RECENT)) && recent.forEach((acc) => {
      const chains = acc.recentChainSlugs || [];

      if (chainSlug && chains.includes(chainSlug)) {
        result.push({
          displayName: acc.name,
          formatedAddress: _reformatAddressWithChain(acc.address, chainInfo),
          address: acc.address,
          analyzedGroup: AnalyzedGroup.RECENT
        });
      }
    });

    (!selectedFilters.length || selectedFilters.includes(AnalyzedGroup.CONTACT)) && contacts.forEach((acc) => {
      if (isChainInfoAccordantAccountChainType(chainInfo, getAccountChainTypeForAddress(acc.address))) {
        result.push({
          displayName: acc.name,
          formatedAddress: _reformatAddressWithChain(acc.address, chainInfo),
          address: acc.address,
          analyzedGroup: AnalyzedGroup.CONTACT
        });
      }
    });

    (!selectedFilters.length || selectedFilters.includes(AnalyzedGroup.WALLET)) && accountProxies.forEach((ap) => {
      if (isAccountAll(ap.id)) {
        return;
      }

      // todo: recheck with ledger

      ap.accounts.forEach((acc) => {
        const formatedAddress = getReformatedAddressRelatedToChain(acc, chainInfo);

        if (formatedAddress) {
          result.push({
            displayName: acc.name,
            formatedAddress,
            address: acc.address,
            analyzedGroup: AnalyzedGroup.WALLET,
            proxyId: ap.id
          });
        }
      });
    });

    // todo: may need better solution for this sorting below

    return result
      .sort((a: AnalyzeAddress, b: AnalyzeAddress) => {
        return ((a?.displayName || '').toLowerCase() > (b?.displayName || '').toLowerCase()) ? 1 : -1;
      })
      .sort((a, b) => getGroupPriority(b) - getGroupPriority(a));
  }, [accountProxies, chainInfo, chainSlug, contacts, recent, selectedFilters]);

  const searchFunction = useCallback((item: AnalyzeAddress, searchText: string) => {
    const searchTextLowerCase = searchText.toLowerCase();

    return (
      item.formatedAddress.toLowerCase().includes(searchTextLowerCase) ||
      (item.displayName
        ? item.displayName.toLowerCase().includes(searchTextLowerCase)
        : false)
    );
  }, []);

  const onClose = useCallback(() => {
    inactiveModal(id);
    onResetFilter();
  }, [id, inactiveModal, onResetFilter]);

  const onSelectItem = useCallback((item: AnalyzeAddress) => {
    return () => {
      inactiveModal(id);
      onSelect(item.formatedAddress, item);
      onResetFilter();
    };
  }, [id, inactiveModal, onResetFilter, onSelect]);

  const renderItem = useCallback((item: AnalyzeAddress) => {
    return (
      <AddressSelectorItem
        address={item.formatedAddress}
        avatarValue={item.proxyId || item.address}
        className={'__list-item'}
        isSelected={value.toLowerCase() === item.formatedAddress.toLowerCase()}
        key={`${item.formatedAddress}_${item.analyzedGroup}`}
        name={item.displayName}
        onClick={onSelectItem(item)}
      />
    );
  }, [onSelectItem, value]);

  const groupSeparator = useCallback((group: AnalyzeAddress[], idx: number, groupKey: string) => {
    const _group = groupKey as AnalyzedGroup;

    let groupLabel = _group;

    switch (_group) {
      case AnalyzedGroup.WALLET:
        groupLabel = t('Your wallet');
        break;
      case AnalyzedGroup.CONTACT:
        groupLabel = t('Saved contacts');
        break;
      case AnalyzedGroup.RECENT:
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
          enableSearchInput={true}
          groupBy='analyzedGroup'
          groupSeparator={groupSeparator}
          list={items}
          onClickActionBtn={openFilter}
          ref={sectionRef}
          renderItem={renderItem}
          renderWhenEmpty={renderEmpty}
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
    '.ant-sw-modal-body': {
      display: 'flex',
      paddingLeft: 0,
      paddingRight: 0
    },

    '.ant-sw-list-section': {
      flex: 1
    },

    '.ant-sw-list': {
      paddingBottom: 0
    },

    '.___list-separator + .__list-item, .__list-item + .__list-item, .__list-item + .___list-separator': {
      marginTop: token.marginXS
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
