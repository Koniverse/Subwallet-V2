// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainAsset } from '@subwallet/chain-list/types';
import { _getMultiChainAsset, _isAssetFungibleToken } from '@subwallet/extension-base/services/chain-service/utils';
import { BasicInputWrapper } from '@subwallet/extension-koni-ui/components/Field/Base';
import { useAccountBalance, useSelector } from '@subwallet/extension-koni-ui/hooks';
import { useChainAssets } from '@subwallet/extension-koni-ui/hooks/assets';
import useTranslation from '@subwallet/extension-koni-ui/hooks/common/useTranslation';
import { useSelectModalInputHelper } from '@subwallet/extension-koni-ui/hooks/form/useSelectModalInputHelper';
import { Theme, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { sortTokenByValue } from '@subwallet/extension-koni-ui/utils';
import { Icon, InputRef, Logo, Number, SelectModal } from '@subwallet/react-ui';
import TokenItem from '@subwallet/react-ui/es/web3-block/token-item';
import CN from 'classnames';
import { CheckCircle } from 'phosphor-react';
import React, { ForwardedRef, forwardRef, useCallback, useEffect, useMemo } from 'react';
import styled, { useTheme } from 'styled-components';

import { GeneralEmptyList } from '../EmptyList';

export type TokenItemType = {
  name: string;
  slug: string;
  symbol: string;
  originChain: string;
};

interface Props extends ThemeProps, BasicInputWrapper {
  items: TokenItemType[];
  showChainInSelected?: boolean;
  prefixShape?: 'circle' | 'none' | 'squircle' | 'square';
  filterFunction?: (chainAsset: _ChainAsset) => boolean;
  isShowBalance?: boolean;
  selectedAccount?: string
}

const renderEmpty = () => <GeneralEmptyList />;

const convertChainActivePriority = (active?: boolean) => active ? 1 : 0;

function Component (props: Props, ref: ForwardedRef<InputRef>): React.ReactElement<Props> {
  const { className = '', selectedAccount, disabled, filterFunction = _isAssetFungibleToken, id = 'token-select', items, label, placeholder, showChainInSelected = false, statusHelp, tooltip, value, isShowBalance } = props;
  const { t } = useTranslation();
  const { token } = useTheme() as Theme;
  const assetRegistry = useChainAssets({}).chainAssetRegistry;
  const { chainInfoMap, chainStateMap } = useSelector((state) => state.chainStore);

  const tokenGroupMap = useMemo(() => {
    return Object.values(assetRegistry).reduce((tokenGroupMap: Record<string, string[]>, chainAsset) => {
      const multiChainAsset = _getMultiChainAsset(chainAsset);
      const tokenGroupKey = multiChainAsset || chainAsset.slug;

      if (tokenGroupMap[tokenGroupKey]) {
        tokenGroupMap[tokenGroupKey].push(chainAsset.slug);
      } else {
        tokenGroupMap[tokenGroupKey] = [chainAsset.slug];
      }

      return tokenGroupMap;
    }, {});
  }, [assetRegistry]);

  const { tokenBalanceMap } = useAccountBalance(tokenGroupMap, true, selectedAccount);

  const { onSelect } = useSelectModalInputHelper(props, ref);

  const filteredItems = useMemo((): TokenItemType[] => {
    const raw = items.filter((item) => {
      const chainAsset = assetRegistry[item.slug];

      return chainAsset ? filterFunction(chainAsset) : false;
    });

    isShowBalance && raw.sort((a, b) => {
      return sortTokenByValue(tokenBalanceMap[a.slug], tokenBalanceMap[b.slug]);
    });

    raw.sort((a, b) => {
      return convertChainActivePriority(
        chainStateMap[b.originChain]?.active &&
        tokenBalanceMap[b.slug].isReady) -
        convertChainActivePriority(
          chainStateMap[a.originChain]?.active &&
          tokenBalanceMap[a.slug].isReady);
    });

    return raw;
  }, [assetRegistry, chainStateMap, filterFunction, isShowBalance, items, tokenBalanceMap]);

  const chainLogo = useMemo(() => {
    const tokenInfo = filteredItems.find((x) => x.slug === value);

    return tokenInfo &&
      (
        <Logo
          className='token-logo'
          isShowSubLogo={true}
          shape='squircle'
          size={token.controlHeightSM}
          subNetwork={tokenInfo.originChain}
          token={tokenInfo.slug.toLowerCase()}
        />
      );
  }, [filteredItems, token.controlHeightSM, value]);

  const renderTokenSelected = useCallback((item: TokenItemType) => {
    return (
      <div className={'__selected-item'}>
        {item.symbol}
        {showChainInSelected}
      </div>
    );
  }, [showChainInSelected]);

  const searchFunction = useCallback((item: TokenItemType, searchText: string) => {
    const searchTextLowerCase = searchText.toLowerCase();
    const chainName = chainInfoMap[item.originChain]?.name?.toLowerCase();
    const symbol = item.symbol.toLowerCase();

    return (
      symbol.includes(searchTextLowerCase) ||
      chainName.includes(searchTextLowerCase)
    );
  }, [chainInfoMap]);

  const renderItem = useCallback((item: TokenItemType, selected: boolean) => {
    return (
      <TokenItem
        className={'token-item'}
        isShowSubLogo={true}
        middleItem={(
          <div className='__token-info-container'>
            <div className='__token-info-row'>
              <div className='__token-info'>
                <span>{item.symbol}</span>
                {
                  !!item.name && (
                    <span className='__token-name-wrapper'>
                      &nbsp;(
                      <span className='__token-name'>{item.name}</span>
                      )
                    </span>
                  )
                }
              </div>
              { !!isShowBalance &&
                tokenBalanceMap[item.slug].isReady &&
                chainStateMap[item.originChain].active &&
                <Number
                  className={CN('__value', {
                    '-is-not-selected': !selected
                  })}
                  decimal={0}
                  decimalOpacity={0.45}
                  value={tokenBalanceMap[item.slug].total.value}
                /> }
            </div>
            <div className='__token-info-row'>
              <div className='__token-original-chain'>
                {chainInfoMap[item.originChain]?.name || item.originChain}
              </div>
              { !!isShowBalance &&
                tokenBalanceMap[item.slug].isReady &&
                chainStateMap[item.originChain].active &&
                <Number
                  className={CN('__converted-value', {
                    '-is-not-selected': !selected
                  })}
                  decimal={0}
                  decimalOpacity={0.45}
                  intOpacity={0.45}
                  prefix='$'
                  size={12}
                  unitOpacity={0.45}
                  value={tokenBalanceMap[item.slug].total.convertedValue}
                />}
            </div>
          </div>
        )}
        name={item.symbol}
        networkMainLogoShape='squircle'
        networkMainLogoSize={38}
        networkSubLogoShape='circle'
        rightItem={
          selected && (
            <div className={'__check-icon'}>
              <Icon
                customSize={'20px'}
                iconColor={token.colorSuccess}
                phosphorIcon={CheckCircle}
                type='phosphor'
                weight='fill'
              />
            </div>
          )}
        subName=''
        subNetworkKey={item.originChain}
        symbol={item.slug.toLowerCase()}
      />
    );
  }, [chainInfoMap, chainStateMap, isShowBalance, token.colorSuccess, tokenBalanceMap]);

  useEffect(() => {
    if (value) {
      const existed = filteredItems.find((item) => item.slug === value);

      if (!existed) {
        onSelect(filteredItems[0]?.slug || '');
      }
    }
  }, [value, filteredItems, onSelect]);

  useEffect(() => {
    if (!value && items[0]?.slug) {
      onSelect(items[0]?.slug);
    }
  }, [items, onSelect, value]);

  return (
    <SelectModal
      className={`${className} chain-selector-modal`}
      disabled={disabled}
      id={id}
      inputClassName={`${className} chain-selector-input`}
      itemKey={'slug'}
      items={filteredItems}
      label={label}
      onSelect={onSelect}
      placeholder={placeholder || t('Select token')}
      prefix={value !== '' && chainLogo}
      renderItem={renderItem}
      renderSelected={renderTokenSelected}
      renderWhenEmpty={renderEmpty}
      searchFunction={searchFunction}
      searchMinCharactersCount={2}
      searchPlaceholder={t<string>('Enter token name or network name')}
      selected={value || ''}
      statusHelp={statusHelp}
      title={label || placeholder || t('Select token')}
      tooltip={tooltip}
    />
  );
}

export const TokenSelector = styled(forwardRef(Component))<Props>(({ theme: { token } }: Props) => {
  return ({
    '&.ant-select-modal-input-container .ant-select-modal-input-wrapper': {
      paddingLeft: 12,
      paddingRight: 12
    },

    '&.chain-selector-input .__selected-item': {
      color: token.colorText,
      textOverflow: 'ellipsis',
      overflow: 'hidden',
      textWrap: 'nowrap',
      whiteSpace: 'nowrap'
    },

    // TODO: delete this when fix component in ui-base
    '.token-item .ant-network-item-sub-name': {
      display: 'none'
    },

    '.token-logo': {
      bottom: 0,
      right: 0,
      margin: '-1px 0',

      '.-sub-logo': {
        '.ant-image': {
          display: 'flex'
        }
      }
    },

    '.ant-network-item-content': {
      padding: token.paddingSM
    },

    '.token-item .__check-icon': {
      display: 'flex',
      width: 40,
      justifyContent: 'center'
    },

    '.__token-info-row': {
      display: 'flex',
      justifyContent: 'space-between',
      flexDirection: 'row',
      gap: token.paddingSM
    },

    '.__value': {
      fontSize: token.fontSizeLG,
      whiteSpace: 'nowrap',
      lineHeight: token.lineHeightLG
    },

    '.__converted-value': {
      lineHeight: token.lineHeight,
      fontSize: token.fontSizeSM,
      whiteSpace: 'nowrap'
    },

    '.-is-not-selected': {
      marginRight: token.margin * 2
    },

    '.ant-number .ant-typography': {
      fontSize: 'inherit !important',
      color: 'inherit !important',
      lineHeight: 'inherit'
    },

    '.__token-info': {
      display: 'flex',
      flexDirection: 'row',
      overflow: 'hidden',
      fontSize: token.fontSizeHeading5,
      whiteSpace: 'nowrap',
      lineHeight: token.lineHeightHeading5,
      fontWeight: token.fontWeightStrong,
      color: token.colorWhite
    },

    '.__token-name-wrapper': {
      color: token.colorTextTertiary,
      display: 'flex',
      flexDirection: 'row',
      overflow: 'hidden',

      '.__token-name': {
        textOverflow: 'ellipsis',
        overflow: 'hidden',
        whiteSpace: 'nowrap'
      }
    },

    '.__token-original-chain': {
      fontSize: token.fontSizeSM,
      lineHeight: token.lineHeightSM,
      color: token.colorTextDescription
    }
  });
});
