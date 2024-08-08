// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainAsset } from '@subwallet/chain-list/types';
import { _getChainName } from '@subwallet/extension-base/services/chain-service/utils';
import { TokenSelectorItem } from '@subwallet/extension-koni-ui/components';
import TokenEmptyList from '@subwallet/extension-koni-ui/components/EmptyList/TokenEmptyList';
import { RECEIVE_MODAL_TOKEN_SELECTOR } from '@subwallet/extension-koni-ui/constants';
import { useSelector, useTranslation } from '@subwallet/extension-koni-ui/hooks';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import { ModalContext, SwList, SwModal } from '@subwallet/react-ui';
import { SwListSectionRef } from '@subwallet/react-ui/es/sw-list';
import React, { useCallback, useContext, useEffect, useRef } from 'react';
import styled from 'styled-components';

interface Props extends ThemeProps {
  onSelectItem?: (item: _ChainAsset) => void,
  items: _ChainAsset[];
  onCancel?: VoidFunction;
}

const modalId = RECEIVE_MODAL_TOKEN_SELECTOR;

const renderEmpty = () => <TokenEmptyList modalId={modalId} />;

function Component ({ className = '', items, onCancel, onSelectItem }: Props): React.ReactElement<Props> {
  const { t } = useTranslation();
  const { checkActive } = useContext(ModalContext);

  // @ts-ignore
  const chainInfoMap = useSelector((state) => state.chainStore.chainInfoMap);

  const isActive = checkActive(modalId);

  const sectionRef = useRef<SwListSectionRef>(null);

  const searchFunction = useCallback((item: _ChainAsset, searchText: string) => {
    return item.symbol.toLowerCase().includes(searchText.toLowerCase());
  }, []);

  const onSelect = useCallback((item: _ChainAsset) => {
    return () => {
      onSelectItem?.(item);
    };
  }, [onSelectItem]);

  const renderItem = useCallback((item: _ChainAsset) => {
    return (
      <TokenSelectorItem
        className={'token-selector-item'}
        key={item.slug}
        networkName={_getChainName(chainInfoMap[item.originChain])}
        onClick={onSelect(item)}
        tokenSymbol={item.symbol}
      />
    );
  }, [chainInfoMap, onSelect]);

  useEffect(() => {
    if (!isActive) {
      setTimeout(() => {
        sectionRef.current?.setSearchValue('');
      }, 100);
    }
  }, [isActive]);

  return (
    <SwModal
      className={`${className}`}
      id={modalId}
      onCancel={onCancel}
      title={t('Select token')}
    >
      <SwList.Section
        enableSearchInput={true}
        list={items}
        ref={sectionRef}
        renderItem={renderItem}
        renderWhenEmpty={renderEmpty}
        searchFunction={searchFunction}
        searchMinCharactersCount={2}
        searchPlaceholder={t<string>('Token name')}
      />
    </SwModal>
  );
}

export const TokenSelectorModal = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return ({
    '.ant-sw-modal-body': {
      paddingLeft: 0,
      paddingRight: 0
    },

    '.token-selector-item + .token-selector-item': {
      marginTop: token.marginXS
    }
  });
});
