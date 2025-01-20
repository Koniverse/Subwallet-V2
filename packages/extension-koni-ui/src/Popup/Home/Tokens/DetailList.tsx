// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _getAssetOriginChain } from '@subwallet/extension-base/services/chain-service/utils';
import { TON_CHAINS } from '@subwallet/extension-base/services/earning-service/constants';
import { AccountChainType, AccountProxy, AccountProxyType, BuyTokenInfo } from '@subwallet/extension-base/types';
import { detectTranslate } from '@subwallet/extension-base/utils';
import { AccountSelectorModal, AlertBox, CloseIcon, ReceiveModal, TonWalletContractSelectorModal } from '@subwallet/extension-koni-ui/components';
import PageWrapper from '@subwallet/extension-koni-ui/components/Layout/PageWrapper';
import BannerGenerator from '@subwallet/extension-koni-ui/components/StaticContent/BannerGenerator';
import { TokenBalanceDetailItem } from '@subwallet/extension-koni-ui/components/TokenItem/TokenBalanceDetailItem';
import { DEFAULT_SWAP_PARAMS, DEFAULT_TRANSFER_PARAMS, IS_SHOW_TON_CONTRACT_VERSION_WARNING, SWAP_TRANSACTION, TON_ACCOUNT_SELECTOR_MODAL, TON_WALLET_CONTRACT_SELECTOR_MODAL, TRANSFER_TRANSACTION } from '@subwallet/extension-koni-ui/constants';
import { DataContext } from '@subwallet/extension-koni-ui/contexts/DataContext';
import { HomeContext } from '@subwallet/extension-koni-ui/contexts/screen/HomeContext';
import { useCoreReceiveModalHelper, useDefaultNavigate, useGetBannerByScreen, useGetChainSlugsByAccount, useNavigateOnChangeAccount, useNotification, useSelector } from '@subwallet/extension-koni-ui/hooks';
import { DetailModal } from '@subwallet/extension-koni-ui/Popup/Home/Tokens/DetailModal';
import { DetailUpperBlock } from '@subwallet/extension-koni-ui/Popup/Home/Tokens/DetailUpperBlock';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import { AccountAddressItemType, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { TokenBalanceItemType } from '@subwallet/extension-koni-ui/types/balance';
import { getTransactionFromAccountProxyValue, isAccountAll, sortTokensByStandard } from '@subwallet/extension-koni-ui/utils';
import { isTonAddress } from '@subwallet/keyring';
import { KeypairType } from '@subwallet/keyring/types';
import { ModalContext } from '@subwallet/react-ui';
import { SwNumberProps } from '@subwallet/react-ui/es/number';
import classNames from 'classnames';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { useLocalStorage } from 'usehooks-ts';

type Props = ThemeProps;

type CurrentSelectToken = {
  symbol: string;
  slug: string;
}

function WrapperComponent ({ className = '' }: ThemeProps): React.ReactElement<Props> {
  const dataContext = useContext(DataContext);

  return (
    <PageWrapper
      className={`tokens ${className}`}
      resolve={dataContext.awaitStores(['price', 'chainStore', 'assetRegistry', 'balance', 'swap'])}
    >
      <Component />
    </PageWrapper>
  );
}

const tonAccountSelectorModalId = TON_ACCOUNT_SELECTOR_MODAL;
const tonWalletContractSelectorModalId = TON_WALLET_CONTRACT_SELECTOR_MODAL;
const TokenDetailModalId = 'tokenDetailModalId';

function Component (): React.ReactElement {
  const { slug: tokenGroupSlug } = useParams();

  const notify = useNotification();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { goHome } = useDefaultNavigate();

  const { activeModal, checkActive, inactiveModal } = useContext(ModalContext);
  const { accountBalance: { tokenBalanceMap, tokenGroupBalanceMap }, tokenGroupStructure: { tokenGroupMap } } = useContext(HomeContext);

  const assetRegistryMap = useSelector((root: RootState) => root.assetRegistry.assetRegistry);
  const multiChainAssetMap = useSelector((state: RootState) => state.assetRegistry.multiChainAssetMap);
  const accountProxies = useSelector((state: RootState) => state.accountState.accountProxies);
  const currentAccountProxy = useSelector((state: RootState) => state.accountState.currentAccountProxy);
  const isAllAccount = useSelector((state: RootState) => state.accountState.isAllAccount);
  const { tokens } = useSelector((state: RootState) => state.buyService);
  const swapPairs = useSelector((state) => state.swap.swapPairs);
  const priorityTokens = useSelector((root: RootState) => root.chainStore.priorityTokens);
  const [, setStorage] = useLocalStorage(TRANSFER_TRANSACTION, DEFAULT_TRANSFER_PARAMS);
  const [, setSwapStorage] = useLocalStorage(SWAP_TRANSACTION, DEFAULT_SWAP_PARAMS);
  const { banners, dismissBanner, onClickBanner } = useGetBannerByScreen('token_detail', tokenGroupSlug);
  const allowedChains = useGetChainSlugsByAccount();
  const isTonWalletContactSelectorModalActive = checkActive(tonWalletContractSelectorModalId);
  const [isShowTonWarning, setIsShowTonWarning] = useLocalStorage(IS_SHOW_TON_CONTRACT_VERSION_WARNING, true);
  const tonAddress = useMemo(() => {
    return currentAccountProxy?.accounts.find((acc) => isTonAddress(acc.address))?.address;
  }, [currentAccountProxy]);
  const [currentTonAddress, setCurrentTonAddress] = useState(isAllAccount ? undefined : tonAddress);

  const filteredAccountList: AccountAddressItemType[] = useMemo(() => {
    return accountProxies.filter((acc) => {
      const isTonSoloAcc = acc.accountType === AccountProxyType.SOLO && acc.chainTypes.includes(AccountChainType.TON);

      return acc.accountType === AccountProxyType.UNIFIED || isTonSoloAcc;
    }).map((item) => {
      const tonAcc = item.accounts.find((a) => isTonAddress(a.address));

      return {
        accountName: item.name,
        accountProxyId: item.id,
        accountProxyType: item.accountType,
        accountType: tonAcc?.type as KeypairType,
        address: tonAcc?.address || '',
        accountActions: item.accountActions
      };
    });
  }, [accountProxies]);

  const fromAndToTokenMap = useMemo<Record<string, string[]>>(() => {
    const result: Record<string, string[]> = {};

    swapPairs.forEach((pair) => {
      if (!result[pair.from]) {
        result[pair.from] = [pair.to];
      } else {
        result[pair.from].push(pair.to);
      }
    });

    return result;
  }, [swapPairs]);

  const isEnableSwapButton = useMemo(() => {
    return Object.keys(fromAndToTokenMap).some((tokenSlug) => {
      const chainAsset = assetRegistryMap[tokenSlug];

      if (chainAsset && !allowedChains.includes(_getAssetOriginChain(chainAsset))) {
        return false;
      }

      return chainAsset.slug === tokenGroupSlug || chainAsset.multiChainAsset === tokenGroupSlug;
    });
  }, [allowedChains, assetRegistryMap, fromAndToTokenMap, tokenGroupSlug]);

  const containerRef = useRef<HTMLDivElement>(null);
  const topBlockRef = useRef<HTMLDivElement>(null);

  const { onOpenReceive, receiveModalProps } = useCoreReceiveModalHelper(tokenGroupSlug);

  useNavigateOnChangeAccount('/home/tokens');

  const symbol = useMemo<string>(() => {
    if (tokenGroupSlug) {
      if (multiChainAssetMap[tokenGroupSlug]) {
        return multiChainAssetMap[tokenGroupSlug].symbol;
      }

      if (assetRegistryMap[tokenGroupSlug]) {
        return assetRegistryMap[tokenGroupSlug].symbol;
      }
    }

    return '';
  }, [tokenGroupSlug, assetRegistryMap, multiChainAssetMap]);

  const buyInfos = useMemo(() => {
    const slug = tokenGroupSlug || '';
    const slugs = tokenGroupMap[slug] ? tokenGroupMap[slug] : [slug];
    const result: BuyTokenInfo[] = [];

    Object.values(tokens).forEach((item) => {
      if (!allowedChains.includes(item.network) || !slugs.includes(item.slug)) {
        return;
      }

      result.push(item);
    });

    return result;
  }, [allowedChains, tokenGroupMap, tokenGroupSlug, tokens]);

  const tokenBalanceValue = useMemo<SwNumberProps['value']>(() => {
    if (tokenGroupSlug) {
      if (tokenGroupBalanceMap[tokenGroupSlug]) {
        return tokenGroupBalanceMap[tokenGroupSlug].total.convertedValue;
      }

      if (tokenBalanceMap[tokenGroupSlug]) {
        return tokenBalanceMap[tokenGroupSlug].total.convertedValue;
      }
    }

    return '0';
  }, [tokenGroupSlug, tokenBalanceMap, tokenGroupBalanceMap]);

  const tokenBalanceItems = useMemo<TokenBalanceItemType[]>(() => {
    if (tokenGroupSlug) {
      if (tokenGroupMap[tokenGroupSlug]) {
        const items: TokenBalanceItemType[] = [];

        tokenGroupMap[tokenGroupSlug].forEach((tokenSlug) => {
          if (tokenBalanceMap[tokenSlug]) {
            items.push(tokenBalanceMap[tokenSlug]);
          }
        });

        sortTokensByStandard(items, priorityTokens);

        return items;
      }

      if (tokenBalanceMap[tokenGroupSlug]) {
        return [tokenBalanceMap[tokenGroupSlug]];
      }
    }

    return [] as TokenBalanceItemType[];
  }, [tokenGroupSlug, tokenGroupMap, tokenBalanceMap, priorityTokens]);

  const isHaveOnlyTonSoloAcc = useMemo(() => {
    const checkValidAcc = (currentAcc: AccountProxy) => {
      return currentAcc?.accountType === AccountProxyType.SOLO && currentAcc?.chainTypes.includes(AccountChainType.TON);
    };

    if (isAllAccount) {
      return accountProxies.filter((a) => a.accountType !== AccountProxyType.ALL_ACCOUNT).every((acc) => checkValidAcc(acc));
    } else {
      return currentAccountProxy && checkValidAcc(currentAccountProxy);
    }
  }, [accountProxies, currentAccountProxy, isAllAccount]);

  const isReadonlyAccount = useMemo(() => {
    return currentAccountProxy && currentAccountProxy.accountType === AccountProxyType.READ_ONLY;
  }, [currentAccountProxy]);

  const isIncludesTonToken = useMemo(() => {
    return !!TON_CHAINS.length && tokenBalanceItems.some((item) => item.chain && TON_CHAINS.includes(item.chain));
  }, [tokenBalanceItems]);

  const [currentTokenInfo, setCurrentTokenInfo] = useState<CurrentSelectToken| undefined>(undefined);
  const [isShrink, setIsShrink] = useState<boolean>(false);

  const handleScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
    const topPosition = event.currentTarget.scrollTop;

    if (topPosition > 60) {
      setIsShrink((value) => {
        if (!value && topBlockRef.current && containerRef.current) {
          const containerProps = containerRef.current.getBoundingClientRect();

          topBlockRef.current.style.position = 'fixed';
          topBlockRef.current.style.opacity = '0';
          topBlockRef.current.style.paddingTop = '0';
          topBlockRef.current.style.top = `${Math.floor(containerProps.top)}px`;
          topBlockRef.current.style.left = `${containerProps.left}px`;
          topBlockRef.current.style.right = `${containerProps.right}px`;
          topBlockRef.current.style.width = `${containerProps.width}px`;

          setTimeout(() => {
            if (topBlockRef.current) {
              topBlockRef.current.style.paddingTop = '8px';
              topBlockRef.current.style.opacity = '1';
            }
          }, 100);
        }

        return true;
      });
    } else {
      setIsShrink((value) => {
        if (value && topBlockRef.current) {
          topBlockRef.current.style.position = 'absolute';
          topBlockRef.current.style.top = '0';
          topBlockRef.current.style.left = '0';
          topBlockRef.current.style.right = '0';
          topBlockRef.current.style.width = '100%';
          topBlockRef.current.style.opacity = '0';

          setTimeout(() => {
            if (topBlockRef.current) {
              topBlockRef.current.style.opacity = '1';
            }
          }, 100);
        }

        return false;
      });
    }
  }, []);

  const handleResize = useCallback(() => {
    const topPosition = containerRef.current?.scrollTop || 0;

    if (topPosition > 60) {
      if (topBlockRef.current && containerRef.current) {
        const containerProps = containerRef.current.getBoundingClientRect();

        topBlockRef.current.style.top = `${Math.floor(containerProps.top)}px`;
        topBlockRef.current.style.left = `${containerProps.left}px`;
        topBlockRef.current.style.right = `${containerProps.right}px`;
        topBlockRef.current.style.width = `${containerProps.width}px`;
      }
    } else {
      if (topBlockRef.current) {
        topBlockRef.current.style.top = '0';
        topBlockRef.current.style.left = '0';
        topBlockRef.current.style.right = '0';
        topBlockRef.current.style.width = '100%';
      }
    }
  }, []);

  const onCloseDetail = useCallback(() => {
    setCurrentTokenInfo(undefined);
  }, []);

  const onClickItem = useCallback((item: TokenBalanceItemType) => {
    return () => {
      if (item.isReady) {
        setCurrentTokenInfo({
          slug: item.slug,
          symbol: item.symbol
        });
      }
    };
  }, []);

  const onOpenSendFund = useCallback(() => {
    if (!currentAccountProxy) {
      return;
    }

    if (currentAccountProxy.accountType === AccountProxyType.READ_ONLY) {
      notify({
        message: t('The account you are using is watch-only, you cannot send assets with it'),
        type: 'info',
        duration: 3
      });

      return;
    }

    setStorage({
      ...DEFAULT_TRANSFER_PARAMS,
      fromAccountProxy: getTransactionFromAccountProxyValue(currentAccountProxy),
      defaultSlug: tokenGroupSlug || ''
    });

    navigate('/transaction/send-fund');
  },
  [currentAccountProxy, navigate, notify, setStorage, t, tokenGroupSlug]
  );

  const onOpenBuyTokens = useCallback(() => {
    let symbol = '';

    if (buyInfos.length) {
      if (buyInfos.length === 1) {
        symbol = buyInfos[0].slug;
      } else {
        symbol = buyInfos[0].symbol;
      }
    }

    navigate('/buy-tokens', { state: { symbol } });
  },
  [buyInfos, navigate]
  );

  const onOpenSwap = useCallback(() => {
    if (!currentAccountProxy) {
      return;
    }

    if (currentAccountProxy.accountType === AccountProxyType.READ_ONLY) {
      notify({
        message: t('The account you are using is watch-only, you cannot send assets with it'),
        type: 'info',
        duration: 3
      });

      return;
    }

    const filteredAccounts = accountProxies.filter((ap) => !isAccountAll(ap.id));

    const isAllLedger = currentAccountProxy.accountType === AccountProxyType.LEDGER || (filteredAccounts.length > 0 && filteredAccounts.every((ap) => ap.accountType === AccountProxyType.LEDGER));

    if (isAllLedger) {
      notify({
        message: 'The account you are using is Ledger account, you cannot use this feature with it',
        type: 'error',
        duration: 3
      });

      return;
    }

    setSwapStorage({
      ...DEFAULT_SWAP_PARAMS,
      fromAccountProxy: getTransactionFromAccountProxyValue(currentAccountProxy),
      defaultSlug: tokenGroupSlug || ''
    });
    navigate('/transaction/swap');
  }, [accountProxies, currentAccountProxy, navigate, notify, setSwapStorage, t, tokenGroupSlug]);

  const onCloseAccountSelector = useCallback(() => {
    setIsShowTonWarning(false);
    inactiveModal(tonAccountSelectorModalId);
  }, [inactiveModal, setIsShowTonWarning]);

  const onSelectAccountSelector = useCallback((item: AccountAddressItemType) => {
    setCurrentTonAddress(item.address);
    activeModal(tonWalletContractSelectorModalId);
  }, [activeModal]);

  useEffect(() => {
    if (currentTokenInfo) {
      activeModal(TokenDetailModalId);
    } else {
      inactiveModal(TokenDetailModalId);
    }
  }, [activeModal, currentTokenInfo, inactiveModal]);

  useEffect(() => {
    setIsShrink(false);
  }, [tokenGroupSlug]);

  // This useEffect triggers when the wallet version changes, causing tokenBalanceItems to temporarily be empty

  // useEffect(() => {
  //   if (!tokenBalanceItems.length) {
  //     goHome();
  //   }
  // }, [goHome, tokenBalanceItems.length]);

  useEffect(() => {
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  const onBackTonWalletContactModal = useCallback(() => {
    inactiveModal(tonWalletContractSelectorModalId);
  }, [inactiveModal]);

  const onCloseTonWalletContactModal = useCallback(() => {
    setIsShowTonWarning(false);
    inactiveModal(tonAccountSelectorModalId);
    inactiveModal(tonWalletContractSelectorModalId);
  }, [inactiveModal, setIsShowTonWarning]);

  const onOpenTonWalletContactModal = useCallback(() => {
    if (isAllAccount) {
      activeModal(tonAccountSelectorModalId);
    } else {
      setCurrentTonAddress(tonAddress);
      activeModal(tonWalletContractSelectorModalId);
    }
  }, [activeModal, isAllAccount, tonAddress]);

  return (
    <div
      className={'token-detail-container'}
      onScroll={handleScroll}
      ref={containerRef}
    >
      <div
        className={classNames('__upper-block-wrapper', {
          '-is-shrink': isShrink
        })}
        ref={topBlockRef}
      >
        <DetailUpperBlock
          balanceValue={tokenBalanceValue}
          className={'__static-block'}
          isShrink={isShrink}
          isSupportBuyTokens={!!buyInfos.length}
          isSupportSwap={isEnableSwapButton}
          onClickBack={goHome}
          onOpenBuyTokens={onOpenBuyTokens}
          onOpenReceive={onOpenReceive}
          onOpenSendFund={onOpenSendFund}
          onOpenSwap={onOpenSwap}
          symbol={symbol}
        />
      </div>
      <div
        className={'__scroll-container'}
      >
        <div className={'token-detail-banner-wrapper'}>
          {!!banners.length && (<BannerGenerator
            banners={banners}
            dismissBanner={dismissBanner}
            onClickBanner={onClickBanner}
          />)}
        </div>
        {
          tokenBalanceItems.map((item) => (
            <TokenBalanceDetailItem
              key={item.slug}
              {...item}
              onClick={onClickItem(item)}
            />
          ))
        }
        {
          !isHaveOnlyTonSoloAcc && !isReadonlyAccount && isIncludesTonToken && isShowTonWarning && (
            <>
              <AlertBox
                className={classNames('ton-solo-acc-alert-area')}
                description={<Trans
                  components={{
                    highlight: (
                      <a
                        className='link'
                        onClick={onOpenTonWalletContactModal}
                      />
                    )
                  }}
                  i18nKey={detectTranslate("TON wallets have multiple versions, each with its own wallet address and balance. <highlight>Change versions</highlight> if you don't see balances")}
                />}
                title={t('Change wallet address & version')}
                type={'warning'}
              />
              {!!filteredAccountList.length && (
                <AccountSelectorModal
                  items={filteredAccountList}
                  modalId={tonAccountSelectorModalId}
                  onCancel={onCloseAccountSelector}
                  onSelectItem={onSelectAccountSelector}
                />
              )}
              {currentTonAddress && isTonWalletContactSelectorModalActive &&
                <TonWalletContractSelectorModal
                  address={currentTonAddress}
                  chainSlug={'ton'}
                  id={tonWalletContractSelectorModalId}
                  isShowBackButton={isAllAccount}
                  onBack={onBackTonWalletContactModal}
                  onCancel={onCloseTonWalletContactModal}
                  rightIconProps={{
                    icon: <CloseIcon />,
                    onClick: onCloseTonWalletContactModal
                  }}
                />
              }
            </>
          )
        }
      </div>
      <DetailModal
        currentTokenInfo={currentTokenInfo}
        id={TokenDetailModalId}
        onCancel={onCloseDetail}
        tokenBalanceMap={tokenBalanceMap}
      />

      <ReceiveModal
        {...receiveModalProps}
      />
    </div>
  );
}

const Tokens = styled(WrapperComponent)<ThemeProps>(({ theme: { extendToken, token } }: ThemeProps) => {
  return ({
    overflow: 'hidden',

    '.token-detail-container': {
      height: '100%',
      overflow: 'auto',
      color: token.colorTextLight1,
      fontSize: token.fontSizeLG,
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      paddingTop: 206
    },

    '.__scroll-container': {
      flex: 1,
      paddingLeft: token.size,
      paddingRight: token.size
    },

    '.__upper-block-wrapper': {
      position: 'absolute',
      backgroundColor: token.colorBgDefault,
      zIndex: 10,
      height: 206,
      paddingTop: 8,
      top: 0,
      left: 0,
      right: 0,
      display: 'flex',
      alignItems: 'center',
      backgroundImage: extendToken.tokensScreenInfoBackgroundColor,
      transition: 'opacity, padding-top 0.27s ease',

      '&.-is-shrink': {
        height: 128
      }
    },

    '.tokens-upper-block': {
      flex: 1
    },

    '.__scrolling-block': {
      display: 'none'
    },

    '.token-balance-detail-item, .token-detail-banner-wrapper, .ton-solo-acc-alert-area': {
      marginBottom: token.sizeXS
    }
  });
});

export default Tokens;
