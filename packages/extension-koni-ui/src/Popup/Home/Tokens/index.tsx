// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _getOriginChainOfAsset } from '@subwallet/extension-base/services/chain-service/utils';
import { AccountChainType, AccountProxy, AccountProxyType } from '@subwallet/extension-base/types';
import { detectTranslate } from '@subwallet/extension-base/utils';
import { AccountSelectorModal, AlertBox, CloseIcon, EmptyList, PageWrapper, ReceiveModal, TonWalletContractSelectorModal } from '@subwallet/extension-koni-ui/components';
import BannerGenerator from '@subwallet/extension-koni-ui/components/StaticContent/BannerGenerator';
import { TokenGroupBalanceItem } from '@subwallet/extension-koni-ui/components/TokenItem/TokenGroupBalanceItem';
import { DEFAULT_SWAP_PARAMS, DEFAULT_TRANSFER_PARAMS, IS_SHOW_TON_CONTRACT_VERSION_WARNING, SWAP_TRANSACTION, TON_ACCOUNT_SELECTOR_MODAL, TON_WALLET_CONTRACT_SELECTOR_MODAL, TRANSFER_TRANSACTION } from '@subwallet/extension-koni-ui/constants';
import { DataContext } from '@subwallet/extension-koni-ui/contexts/DataContext';
import { HomeContext } from '@subwallet/extension-koni-ui/contexts/screen/HomeContext';
import { useCoreReceiveModalHelper, useDebouncedValue, useGetBannerByScreen, useGetChainSlugsByAccount, useSetCurrentPage } from '@subwallet/extension-koni-ui/hooks';
import useNotification from '@subwallet/extension-koni-ui/hooks/common/useNotification';
import useTranslation from '@subwallet/extension-koni-ui/hooks/common/useTranslation';
import { UpperBlock } from '@subwallet/extension-koni-ui/Popup/Home/Tokens/UpperBlock';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import { AccountAddressItemType, ThemeProps, TransferParams } from '@subwallet/extension-koni-ui/types';
import { TokenBalanceItemType } from '@subwallet/extension-koni-ui/types/balance';
import { getTransactionFromAccountProxyValue, isAccountAll, sortTokensByStandard } from '@subwallet/extension-koni-ui/utils';
import { isTonAddress } from '@subwallet/keyring';
import { Button, Icon, ModalContext, SwAlert } from '@subwallet/react-ui';
import classNames from 'classnames';
import { Coins, FadersHorizontal } from 'phosphor-react';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Trans } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useLocalStorage } from 'usehooks-ts';

type Props = ThemeProps;

const tonWalletContractSelectorModalId = TON_WALLET_CONTRACT_SELECTOR_MODAL;
const tonAccountSelectorModalId = TON_ACCOUNT_SELECTOR_MODAL;

const Component = (): React.ReactElement => {
  useSetCurrentPage('/home/tokens');
  const { t } = useTranslation();
  const [isShrink, setIsShrink] = useState<boolean>(false);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const topBlockRef = useRef<HTMLDivElement>(null);
  const accountProxies = useSelector((state: RootState) => state.accountState.accountProxies);
  const currentAccountProxy = useSelector((state: RootState) => state.accountState.currentAccountProxy);
  const isAllAccount = useSelector((state: RootState) => state.accountState.isAllAccount);
  const { accountBalance: { tokenGroupBalanceMap,
    totalBalanceInfo }, tokenGroupStructure: { sortedTokenGroups } } = useContext(HomeContext);
  const notify = useNotification();
  const { onOpenReceive, receiveModalProps } = useCoreReceiveModalHelper();
  const priorityTokens = useSelector((state: RootState) => state.chainStore.priorityTokens);

  const isZkModeSyncing = useSelector((state: RootState) => state.mantaPay.isSyncing);
  const zkModeSyncProgress = useSelector((state: RootState) => state.mantaPay.progress);
  const [, setStorage] = useLocalStorage<TransferParams>(TRANSFER_TRANSACTION, DEFAULT_TRANSFER_PARAMS);
  const [, setSwapStorage] = useLocalStorage(SWAP_TRANSACTION, DEFAULT_SWAP_PARAMS);
  const { banners, dismissBanner, onClickBanner } = useGetBannerByScreen('token');
  const allowedChains = useGetChainSlugsByAccount();
  const buyTokenInfos = useSelector((state: RootState) => state.buyService.tokens);
  const swapPairs = useSelector((state: RootState) => state.swap.swapPairs);
  const { activeModal, checkActive, inactiveModal } = useContext(ModalContext);
  const isTonWalletContactSelectorModalActive = checkActive(tonWalletContractSelectorModalId);
  const [isShowTonWarning, setIsShowTonWarning] = useLocalStorage(IS_SHOW_TON_CONTRACT_VERSION_WARNING, true);
  const tonAddress = useMemo(() => {
    return currentAccountProxy?.accounts.find((acc) => isTonAddress(acc.address))?.address;
  }, [currentAccountProxy]);
  const [currentTonAddress, setCurrentTonAddress] = useState(isAllAccount ? undefined : tonAddress);
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
      return allowedChains.includes(_getOriginChainOfAsset(tokenSlug));
    });
  }, [allowedChains, fromAndToTokenMap]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
    const topPosition = event.currentTarget.scrollTop;

    if (topPosition > 80) {
      setIsShrink((value) => {
        if (!value && topBlockRef.current && containerRef.current) {
          const containerProps = containerRef.current.getBoundingClientRect();

          topBlockRef.current.style.position = 'fixed';
          topBlockRef.current.style.top = `${Math.floor(containerProps.top)}px`;
          topBlockRef.current.style.left = `${containerProps.left}px`;
          topBlockRef.current.style.right = `${containerProps.right}px`;
          topBlockRef.current.style.width = `${containerProps.width}px`;
          topBlockRef.current.style.opacity = '0';
          topBlockRef.current.style.paddingTop = '0';

          setTimeout(() => {
            if (topBlockRef.current) {
              topBlockRef.current.style.opacity = '1';
              topBlockRef.current.style.paddingTop = '32px';
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
          topBlockRef.current.style.paddingTop = '0';

          setTimeout(() => {
            if (topBlockRef.current) {
              topBlockRef.current.style.opacity = '1';
              topBlockRef.current.style.paddingTop = '32px';
            }
          }, 100);
        }

        return false;
      });
    }
  }, []);

  const handleResize = useCallback(() => {
    const topPosition = containerRef.current?.scrollTop || 0;

    if (topPosition > 80) {
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

  const isTotalBalanceDecrease = totalBalanceInfo.change.status === 'decrease';

  const isSupportBuyTokens = useMemo(() => {
    return Object.values(buyTokenInfos).some((item) => allowedChains.includes(item.network));
  }, [allowedChains, buyTokenInfos]);

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

  const tonAccountList: AccountAddressItemType[] = useMemo(() => {
    return accountProxies.filter((acc) => acc?.accountType === AccountProxyType.SOLO && acc?.chainTypes.includes(AccountChainType.TON)).map((item) => ({
      accountName: item.name,
      accountProxyId: item.id,
      accountProxyType: item.accountType,
      accountType: item.accounts[0].type,
      address: item.accounts[0].address,
      accountActions: item.accountActions
    }));
  }, [accountProxies]);

  const onCloseAccountSelector = useCallback(() => {
    setIsShowTonWarning(false);
    inactiveModal(tonAccountSelectorModalId);
  }, [inactiveModal, setIsShowTonWarning]);

  const onSelectAccountSelector = useCallback((item: AccountAddressItemType) => {
    setCurrentTonAddress(item.address);
    activeModal(tonWalletContractSelectorModalId);
  }, [activeModal]);

  const onBackTonWalletContactModal = useCallback(() => {
    inactiveModal(tonWalletContractSelectorModalId);
  }, [inactiveModal]);

  const onCloseTonWalletContactModal = useCallback(() => {
    setIsShowTonWarning(false);
    setTimeout(() => {
      inactiveModal(tonAccountSelectorModalId);
      inactiveModal(tonWalletContractSelectorModalId);
    }, 200);
  }, [inactiveModal, setIsShowTonWarning]);

  const onOpenTonWalletContactModal = useCallback(() => {
    if (isAllAccount) {
      activeModal(tonAccountSelectorModalId);
    } else {
      setCurrentTonAddress(tonAddress);
      activeModal(tonWalletContractSelectorModalId);
    }
  }, [activeModal, isAllAccount, tonAddress]);

  const onClickItem = useCallback((item: TokenBalanceItemType) => {
    return () => {
      navigate(`/home/tokens/detail/${item.slug}`);
    };
  }, [navigate]);

  const onClickManageToken = useCallback(() => {
    navigate('/settings/tokens/manage');
  }, [navigate]);

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
      fromAccountProxy: getTransactionFromAccountProxyValue(currentAccountProxy)
    });
    navigate('/transaction/send-fund');
  },
  [currentAccountProxy, setStorage, navigate, notify, t]
  );

  const onOpenBuyTokens = useCallback(() => {
    navigate('/buy-tokens');
  },
  [navigate]
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
      fromAccountProxy: getTransactionFromAccountProxyValue(currentAccountProxy)
    });
    navigate('/transaction/swap');
  }, [accountProxies, currentAccountProxy, navigate, notify, setSwapStorage, t]);

  const debouncedTokenGroupBalanceMap = useDebouncedValue<Record<string, TokenBalanceItemType>>(tokenGroupBalanceMap, 300);

  const tokenGroupBalanceItems = useMemo((): TokenBalanceItemType[] => {
    const result: TokenBalanceItemType[] = [];

    sortedTokenGroups.forEach((tokenGroupSlug) => {
      if (debouncedTokenGroupBalanceMap[tokenGroupSlug]) {
        result.push(debouncedTokenGroupBalanceMap[tokenGroupSlug]);
      }
    });

    sortTokensByStandard(result, priorityTokens, true);

    return result;
  }, [sortedTokenGroups, debouncedTokenGroupBalanceMap, priorityTokens]);

  useEffect(() => {
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  return (
    <div
      className={'tokens-screen-container'}
      onScroll={handleScroll}
      ref={containerRef}
    >
      <div
        className={classNames('__upper-block-wrapper', {
          '-is-shrink': isShrink,
          '-decrease': isTotalBalanceDecrease
        })}
        ref={topBlockRef}
      >
        <UpperBlock
          isPriceDecrease={isTotalBalanceDecrease}
          isShrink={isShrink}
          isSupportBuyTokens={isSupportBuyTokens}
          isSupportSwap={isEnableSwapButton}
          onOpenBuyTokens={onOpenBuyTokens}
          onOpenReceive={onOpenReceive}
          onOpenSendFund={onOpenSendFund}
          onOpenSwap={onOpenSwap}
          totalChangePercent={totalBalanceInfo.change.percent}
          totalChangeValue={totalBalanceInfo.change.value}
          totalValue={totalBalanceInfo.convertedValue}
        />
      </div>
      <div
        className={'__scroll-container'}
      >
        {
          isZkModeSyncing && (
            <SwAlert
              className={classNames('zk-mode-alert-area')}
              description={t('This may take a few minutes. Please keep the app open')}
              title={t('Zk mode is syncing: {{percent}}%', { replace: { percent: zkModeSyncProgress || '0' } })}
              type={'warning'}
            />
          )
        }
        {
          isHaveOnlyTonSoloAcc && isShowTonWarning && (
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
              <AccountSelectorModal
                items={tonAccountList}
                modalId={tonAccountSelectorModalId}
                onCancel={onCloseAccountSelector}
                onSelectItem={onSelectAccountSelector}
              />
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
        {!!banners.length && (
          <div className={'token-banner-wrapper'}>
            <BannerGenerator
              banners={banners}
              dismissBanner={dismissBanner}
              onClickBanner={onClickBanner}
            />
          </div>
        )}
        {
          tokenGroupBalanceItems.map((item) => {
            return (
              <TokenGroupBalanceItem
                key={item.slug}
                {...item}
                onPressItem={onClickItem(item)}
              />
            );
          })
        }
        {
          !tokenGroupBalanceItems.length && (
            <EmptyList
              className={'__empty-list'}
              emptyMessage={t('Try searching or importing one')}
              emptyTitle={t('No tokens found')}
              phosphorIcon={Coins}
            />
          )
        }
        <div className={'__scroll-footer'}>
          <Button
            icon={<Icon phosphorIcon={FadersHorizontal} />}
            onClick={onClickManageToken}
            size={'xs'}
            type={'ghost'}
          >
            {t('Manage tokens')}
          </Button>
        </div>
      </div>

      <ReceiveModal
        {...receiveModalProps}
      />
    </div>
  );
};

const WrapperComponent = ({ className = '' }: ThemeProps): React.ReactElement<Props> => {
  const dataContext = useContext(DataContext);

  return (
    <PageWrapper
      className={`tokens ${className}`}
      hideLoading={true}
      resolve={dataContext.awaitStores(['price', 'chainStore', 'assetRegistry', 'balance', 'mantaPay', 'swap'])}
    >
      <Component />
    </PageWrapper>
  );
};

const Tokens = styled(WrapperComponent)<ThemeProps>(({ theme: { extendToken, token } }: ThemeProps) => {
  return ({
    overflow: 'hidden',

    '.__empty-list': {
      marginTop: token.marginSM,
      marginBottom: token.marginSM
    },

    '.tokens-screen-container': {
      height: '100%',
      color: token.colorTextLight1,
      fontSize: token.fontSizeLG,
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
      overflowX: 'hidden',
      paddingTop: 210
    },

    '.__scroll-container': {
      paddingLeft: token.size,
      paddingRight: token.size
    },

    '.__upper-block-wrapper': {
      backgroundColor: token.colorBgDefault,
      position: 'absolute',
      paddingTop: '32px',
      height: 210,
      zIndex: 10,
      top: 0,
      left: 0,
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      backgroundImage: extendToken.tokensScreenSuccessBackgroundColor,
      transition: 'opacity, padding-top 0.27s ease',

      '&.-is-shrink': {
        height: 104
      },

      '&.-decrease': {
        backgroundImage: extendToken.tokensScreenDangerBackgroundColor
      }
    },

    '.tokens-upper-block': {
      flex: 1
    },

    '.__scroll-footer': {
      display: 'flex',
      justifyContent: 'center',
      marginBottom: token.size
    },

    '.token-group-balance-item': {
      marginBottom: token.sizeXS
    },

    '.__upper-block-wrapper.-is-shrink': {
      '.__static-block': {
        display: 'none'
      },

      '.__scrolling-block': {
        display: 'flex'
      }
    },

    '.zk-mode-alert-area, .ton-solo-acc-alert-area': {
      marginBottom: token.marginXS
    },

    '.token-banner-wrapper': {
      marginBottom: token.sizeXS
    }
  });
});

export default Tokens;
