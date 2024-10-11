// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { TokenBalanceSelectionItem, TokenEmptyList } from '@subwallet/extension-koni-ui/components';
import Search from '@subwallet/extension-koni-ui/components/Search';
import { useSelector, useTranslation } from '@subwallet/extension-koni-ui/hooks';
import { useChainAssets } from '@subwallet/extension-koni-ui/hooks/assets';
import { AccountBalanceHookType, ThemeProps, TokenBalanceItemType, TokenGroupHookType } from '@subwallet/extension-koni-ui/types';
import { sortTokenByValue } from '@subwallet/extension-koni-ui/utils';
import { SwList, SwModal } from '@subwallet/react-ui';
import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

type Props = ThemeProps & {
  id: string,
  onCancel: () => void,
  tokenBalanceMap: AccountBalanceHookType['tokenBalanceMap'],
  sortedTokenSlugs: TokenGroupHookType['sortedTokenSlugs'],
}

function getTokenBalances (
  tokenBalanceMap: AccountBalanceHookType['tokenBalanceMap'],
  sortedTokenSlugs: TokenGroupHookType['sortedTokenSlugs']): TokenBalanceItemType[] {
  const result: TokenBalanceItemType[] = [];

  sortedTokenSlugs.forEach((tokenSlug) => {
    if (tokenBalanceMap[tokenSlug]) {
      result.push(tokenBalanceMap[tokenSlug]);
    }
  });

  return result;
}

function Component ({ className = '', id, onCancel, sortedTokenSlugs, tokenBalanceMap }: Props): React.ReactElement<Props> {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { chainInfoMap } = useSelector((state) => state.chainStore);
  const { multiChainAssetMap } = useSelector((state) => state.assetRegistry);
  const assetRegistry = useChainAssets({ isActive: true }).chainAssetRegistry;
  const [currentSearchText, setCurrentSearchText] = useState<string>('');

  const tokenBalances = useMemo<TokenBalanceItemType[]>(() => {
    return getTokenBalances(tokenBalanceMap, sortedTokenSlugs).sort(sortTokenByValue);
  }, [tokenBalanceMap, sortedTokenSlugs]);

  const onClickItem = useCallback((item: TokenBalanceItemType) => {
    return () => {
      navigate(`/home/tokens/detail/${item.slug}`);
      onCancel();
    };
  }, [navigate, onCancel]);

  // todo: auto clear search when closing modal, may need update reactUI swList component
  const handleSearch = useCallback((value: string) => {
    setCurrentSearchText(value);
  }, []);

  const renderItem = useCallback(
    (tokenBalance: TokenBalanceItemType) => {
      const slug = tokenBalance.slug;
      const tokenName = assetRegistry[slug]?.name || multiChainAssetMap[slug]?.name || '';

      return (
        <TokenBalanceSelectionItem
          key={slug}
          tokenName={tokenName}
          {...tokenBalance}
          onPressItem={onClickItem(tokenBalance)}
        />
      );
    },
    [assetRegistry, multiChainAssetMap, onClickItem]
  );

  const filteredItems = useMemo(() => {
    const filteredTokenBalances = tokenBalances.filter((item) => {
      const searchTextLowerCase = currentSearchText.toLowerCase();
      const chainName = chainInfoMap[item.chain || '']?.name?.toLowerCase();
      const symbol = item.symbol.toLowerCase();

      return (
        symbol.includes(searchTextLowerCase) ||
        chainName.includes(searchTextLowerCase)
      );
    });

    if (currentSearchText.toLowerCase() === 'ton') {
      const tonItemIndex = filteredTokenBalances.findIndex((item) => item.slug === 'ton-NATIVE-TON');

      if (tonItemIndex !== -1) {
        const [tonItem] = filteredTokenBalances.splice(tonItemIndex, 1);

        if (tonItem) {
          filteredTokenBalances.unshift(tonItem);
        }
      }

      return filteredTokenBalances;
    } else {
      return filteredTokenBalances;
    }
  }, [chainInfoMap, currentSearchText, tokenBalances]);

  const renderEmpty = useCallback(() => {
    return (<TokenEmptyList modalId={id} />);
  }, [id]);

  const onPressCancel = useCallback(() => {
    setCurrentSearchText('');
    onCancel && onCancel();
  }, [onCancel]);

  return (
    <SwModal
      className={className}
      destroyOnClose={true}
      id={id}
      onCancel={onPressCancel}
      title={t('Select token')}
    >
      <Search
        autoFocus={true}
        className={'__search-box'}
        onSearch={handleSearch}
        placeholder={t<string>('Token name')}
        searchValue={currentSearchText}
      />
      <SwList
        className={'__list-container'}
        displayRow
        list={filteredItems}
        renderItem={renderItem}
        renderWhenEmpty={renderEmpty}
        rowGap={'8px'}
        searchableMinCharactersCount={2}
      />
    </SwModal>
  );
}

export const GlobalSearchTokenModal = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return ({
    '.ant-sw-modal-content': {
      height: '100vh'
    },

    '.ant-sw-modal-body': {
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      paddingBottom: 0,
      overflow: 'auto'
    },

    '.ant-sw-list-section': {
      flex: 1
    },

    '.ant-sw-list-search-input': {
      paddingBottom: token.paddingXS
    },

    '.ant-sw-list': {
      paddingBottom: 0
    },

    '.__search-box': {
      marginBottom: token.marginXS
    },

    '.__list-container': {
      overflow: 'auto'
    }
  });
});
