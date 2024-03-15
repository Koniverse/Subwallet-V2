// Copyright 2019-2022 @subwallet/extension-web-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainAsset } from '@subwallet/chain-list/types';
import { SwapError } from '@subwallet/extension-base/background/errors/SwapError';
import { NotificationType } from '@subwallet/extension-base/background/KoniTypes';
import { _getAssetDecimals, _getAssetOriginChain, _getAssetSymbol, _isChainEvmCompatible, _parseAssetRefKey } from '@subwallet/extension-base/services/chain-service/utils';
import { SWTransactionResponse } from '@subwallet/extension-base/services/transaction-service/types';
import { OptimalSwapPath, SwapFeeComponent, SwapFeeType, SwapQuote, SwapRequest } from '@subwallet/extension-base/types/swap';
import { isAccountAll, swapCustomFormatter } from '@subwallet/extension-base/utils';
import { AccountSelector, AddressInput, HiddenInput, PageWrapper, SwapFromField, SwapToField } from '@subwallet/extension-web-ui/components';
import { SwapTeamsOfServiceModal } from '@subwallet/extension-web-ui/components/Modal/Swap';
import AddMoreBalanceModal from '@subwallet/extension-web-ui/components/Modal/Swap/AddMoreBalanceModal';
import ChooseFeeTokenModal from '@subwallet/extension-web-ui/components/Modal/Swap/ChooseFeeTokenModal';
import { SwapRoute } from '@subwallet/extension-web-ui/components/Swap';
import { BN_TEN, BN_ZERO, CONFIRM_SWAP_TERM, DEFAULT_SWAP_PARAMS, SWAP_ALL_QUOTES_MODAL, SWAP_CHOOSE_FEE_TOKEN_MODAL, SWAP_MORE_BALANCE_MODAL, SWAP_SLIPPAGE_MODAL, SWAP_TERMS_OF_SERVICE_MODAL } from '@subwallet/extension-web-ui/constants';
import { DataContext } from '@subwallet/extension-web-ui/contexts/DataContext';
import { ScreenContext } from '@subwallet/extension-web-ui/contexts/ScreenContext';
import { WebUIContext } from '@subwallet/extension-web-ui/contexts/WebUIContext';
import { useChainConnection, useSelector, useTransactionContext, useWatchTransaction } from '@subwallet/extension-web-ui/hooks';
import { getLatestSwapQuote, handleSwapRequest, handleSwapStep, validateSwapProcess } from '@subwallet/extension-web-ui/messaging/transaction/swap';
import { FreeBalance, TransactionContent, TransactionFooter } from '@subwallet/extension-web-ui/Popup/Transaction/parts';
import { DEFAULT_SWAP_PROCESS, SwapActionType, swapReducer } from '@subwallet/extension-web-ui/reducer';
import { Theme } from '@subwallet/extension-web-ui/themes';
import { FormCallbacks, FormFieldData, SwapParams, ThemeProps, TokenSelectorItemType } from '@subwallet/extension-web-ui/types';
import { convertFieldToObject, findAccountByAddress } from '@subwallet/extension-web-ui/utils';
import { ActivityIndicator, BackgroundIcon, Button, Form, Icon, Logo, ModalContext, Number, Tooltip } from '@subwallet/react-ui';
import { Rule } from '@subwallet/react-ui/es/form';
import BigN from 'bignumber.js';
import CN from 'classnames';
import { ArrowsDownUp, CaretDown, CaretRight, CaretUp, CheckCircle, Info, ListBullets, PencilSimpleLine, XCircle } from 'phosphor-react';
import React, { useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled, { useTheme } from 'styled-components';
import { useLocalStorage } from 'usehooks-ts';

import { isAddress, isEthereumAddress } from '@polkadot/util-crypto';

import MetaInfo from '../../../components/MetaInfo/MetaInfo';
import SlippageModal from '../../../components/Modal/Swap/SlippageModal';
import SwapQuotesSelectorModal from '../../../components/Modal/Swap/SwapQuotesSelectorModal';
import useNotification from '../../../hooks/common/useNotification';

type Props = ThemeProps;

interface FeeItem {
  value: BigN,
  type: SwapFeeType,
  label: string,
  prefix?: string,
  suffix?: string
}

const hideFields: Array<keyof SwapParams> = ['fromAmount', 'fromTokenSlug', 'toTokenSlug', 'chain'];

function getTokenSelectorItem (tokenSlugs: string[], assetRegistryMap: Record<string, _ChainAsset>): TokenSelectorItemType[] {
  const result: TokenSelectorItemType[] = [];

  tokenSlugs.forEach((slug) => {
    const asset = assetRegistryMap[slug];

    if (asset) {
      result.push({
        originChain: asset.originChain,
        slug,
        symbol: asset.symbol,
        name: asset.name
      });
    }
  });

  return result;
}

// todo: change to to when it is ready
const supportSlippageSelection = false;
const metadataInfo = { maxNumberFormat: 8 };

const Component = () => {
  const { t } = useTranslation();
  const notify = useNotification();
  const { closeAlert, defaultData, onDone, openAlert, persistData, setBackProps, setCustomScreenTitle } = useTransactionContext<SwapParams>();
  const { isWebUI } = useContext(ScreenContext);

  const { activeModal } = useContext(ModalContext);

  const { accounts, currentAccount, isAllAccount } = useSelector((state) => state.accountState);
  const assetRegistryMap = useSelector((state) => state.assetRegistry.assetRegistry);
  const swapPairs = useSelector((state) => state.swap.swapPairs);
  const priceMap = useSelector((state) => state.price.priceMap);
  const { chainInfoMap } = useSelector((root) => root.chainStore);
  const [form] = Form.useForm<SwapParams>();
  const formDefault = useMemo((): SwapParams => ({ ...defaultData }), [defaultData]);

  const [quoteOptions, setQuoteOptions] = useState<SwapQuote[]>([]);
  const [currentQuote, setCurrentQuote] = useState<SwapQuote | undefined>(undefined);
  const [quoteAliveUntil, setQuoteAliveUntil] = useState<number | undefined>(undefined);
  const [quoteCountdownTime, setQuoteCountdownTime] = useState<number>(0);
  const [currentQuoteRequest, setCurrentQuoteRequest] = useState<SwapRequest | undefined>(undefined);
  const [feeOptions, setFeeOptions] = useState<string[] | undefined>([]);
  const [currentFeeOption, setCurrentFeeOption] = useState<string | undefined>(undefined);
  const [currentSlippage, setCurrentSlippage] = useState<number>(0);
  const [swapError, setSwapError] = useState<SwapError|undefined>(undefined);
  const [isFormInvalid, setIsFormInvalid] = useState<boolean>(false);
  const [currentOptimalSwapPath, setOptimalSwapPath] = useState<OptimalSwapPath | undefined>(undefined);
  // @ts-ignore
  const [confirmedTerm, setConfirmedTerm] = useLocalStorage(CONFIRM_SWAP_TERM, '');
  const showQuoteAreaRef = useRef(false);
  const optimalQuoteRef = useRef<SwapQuote | undefined>(undefined);

  const [isViewFeeDetails, setIsViewFeeDetails] = useState<boolean>(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [handleRequestLoading, setHandleRequestLoading] = useState(true);
  const { token } = useTheme() as Theme;

  // mobile:
  const [showQuoteDetailOnMobile, setShowQuoteDetailOnMobile] = useState<boolean>(false);

  // @ts-ignore
  const fromValue = useWatchTransaction('from', form, defaultData);
  const fromAmountValue = useWatchTransaction('fromAmount', form, defaultData);
  const fromTokenSlugValue = useWatchTransaction('fromTokenSlug', form, defaultData);
  const toTokenSlugValue = useWatchTransaction('toTokenSlug', form, defaultData);
  const chainValue = useWatchTransaction('chain', form, defaultData);
  const recipientValue = useWatchTransaction('recipient', form, defaultData);
  const { checkChainConnected } = useChainConnection();

  const [processState, dispatchProcessState] = useReducer(swapReducer, DEFAULT_SWAP_PROCESS);

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

  const rawFromTokenItems = useMemo<TokenSelectorItemType[]>(() => {
    return getTokenSelectorItem(Object.keys(fromAndToTokenMap), assetRegistryMap);
  }, [assetRegistryMap, fromAndToTokenMap]);

  const fromTokenItems = useMemo<TokenSelectorItemType[]>(() => {
    if (!fromValue) {
      return rawFromTokenItems;
    }

    return rawFromTokenItems.filter((i) => {
      return chainInfoMap[i.originChain] && isEthereumAddress(fromValue) === _isChainEvmCompatible(chainInfoMap[i.originChain]);
    });
  }, [chainInfoMap, fromValue, rawFromTokenItems]);

  const toTokenItems = useMemo<TokenSelectorItemType[]>(() => {
    return getTokenSelectorItem(fromAndToTokenMap[fromTokenSlugValue] || [], assetRegistryMap);
  }, [assetRegistryMap, fromAndToTokenMap, fromTokenSlugValue]);

  // todo: fill later
  const destChain = '';
  const destChainNetworkPrefix = 42;
  const destChainGenesisHash = '';

  const fromAssetInfo = useMemo(() => {
    return assetRegistryMap[fromTokenSlugValue] || undefined;
  }, [assetRegistryMap, fromTokenSlugValue]);

  const toAssetInfo = useMemo(() => {
    return assetRegistryMap[toTokenSlugValue] || undefined;
  }, [assetRegistryMap, toTokenSlugValue]);

  const feeAssetInfo = useMemo(() => {
    return (currentFeeOption ? assetRegistryMap[currentFeeOption] : undefined);
  }, [assetRegistryMap, currentFeeOption]);

  const isSwitchable = useMemo(() => {
    if (!fromAndToTokenMap[toTokenSlugValue]) {
      return false;
    }

    if (!fromValue) {
      return true;
    }

    const toChain = _getAssetOriginChain(toAssetInfo);

    return chainInfoMap[toChain] && isEthereumAddress(fromValue) === _isChainEvmCompatible(chainInfoMap[toChain]);
  }, [chainInfoMap, fromAndToTokenMap, fromValue, toAssetInfo, toTokenSlugValue]);

  const recipientAddressValidator = useCallback((rule: Rule, _recipientAddress: string): Promise<void> => {
    if (!_recipientAddress) {
      return Promise.reject(t('Recipient address is required'));
    }

    if (!isAddress(_recipientAddress)) {
      return Promise.reject(t('Invalid recipient address'));
    }

    if (toAssetInfo?.originChain && chainInfoMap[toAssetInfo?.originChain]) {
      const isAddressEvm = isEthereumAddress(_recipientAddress);
      const isEvmCompatible = _isChainEvmCompatible(chainInfoMap[toAssetInfo?.originChain]);

      if (isAddressEvm !== isEvmCompatible) {
        return Promise.reject(t('Invalid swap recipient account'));
      }
    }

    const account = findAccountByAddress(accounts, _recipientAddress);

    if (account?.isHardware && toAssetInfo?.originChain) {
      const destChainInfo = chainInfoMap[toAssetInfo.originChain];
      const availableGen: string[] = account.availableGenesisHashes || [];

      if (!isEthereumAddress(account.address) && !availableGen.includes(destChainInfo?.substrateInfo?.genesisHash || '')) {
        const destChainName = destChainInfo?.name || 'Unknown';

        return Promise.reject(t('Wrong network. Your Ledger account is not supported by {{network}}. Please choose another receiving account and try again.', { replace: { network: destChainName } }));
      }
    }

    return Promise.resolve();
  }, [accounts, chainInfoMap, t, toAssetInfo?.originChain]);

  const showRecipientField = useMemo(() => {
    if (fromValue && toAssetInfo?.originChain &&
      chainInfoMap[toAssetInfo?.originChain]) {
      const isAddressEvm = isEthereumAddress(fromValue);
      const isEvmCompatibleTo = _isChainEvmCompatible(
        chainInfoMap[toAssetInfo?.originChain]
      );

      return isAddressEvm !== isEvmCompatibleTo;
    }

    return false; // Add a default return value in case none of the conditions are met
  }, [chainInfoMap, fromValue, toAssetInfo?.originChain]);

  const onSelectFromToken = useCallback((tokenSlug: string) => {
    form.setFieldValue('fromTokenSlug', tokenSlug);
  }, [form]);

  const onSelectToToken = useCallback((tokenSlug: string) => {
    form.setFieldValue('toTokenSlug', tokenSlug);
  }, [form]);

  const onOpenSlippageModal = useCallback(() => {
    if (supportSlippageSelection) {
      activeModal(SWAP_SLIPPAGE_MODAL);
    }
  }, [activeModal]);

  const openAllQuotesModal = useCallback(() => {
    activeModal(SWAP_ALL_QUOTES_MODAL);
  }, [activeModal]);

  const openChooseFeeToken = useCallback(() => {
    activeModal(SWAP_CHOOSE_FEE_TOKEN_MODAL);
  }, [activeModal]);

  const onSelectQuote = useCallback((quote: SwapQuote) => {
    setCurrentQuote(quote);
    setFeeOptions(quote.feeInfo.feeOptions);
    setCurrentFeeOption(quote.feeInfo.feeOptions?.[0]);
  }, []);

  const onSelectFeeOption = useCallback((slug: string) => {
    setCurrentFeeOption(slug);
  }, []);
  const onSelectSlippage = useCallback((slippage: number) => {
    setCurrentSlippage(slippage);
  }, []);

  const onToggleFeeDetails = useCallback(() => {
    setIsViewFeeDetails((prev) => !prev);
  }, []);

  const onChangeAmount = useCallback((value: string) => {
    form.setFieldValue('fromAmount', value);
  }, [form]);

  const onSwitchSide = useCallback(() => {
    if (fromTokenSlugValue && toTokenSlugValue) {
      form.setFieldsValue({
        fromTokenSlug: toTokenSlugValue,
        toTokenSlug: fromTokenSlugValue
      });
      form.validateFields(['from', 'recipient']).then(() => {
        setIsFormInvalid(false);
      }).catch((e) => {
        console.log('Error when validating', e);
        setIsFormInvalid(true);
      });
    }
  }, [form, fromTokenSlugValue, toTokenSlugValue]);

  const onFieldsChange: FormCallbacks<SwapParams>['onFieldsChange'] = useCallback((changedFields: FormFieldData[], allFields: FormFieldData[]) => {
    const values = convertFieldToObject<SwapParams>(allFields);

    persistData(values);
  }, [persistData]);

  const estimatedFeeValue = useMemo(() => {
    let totalBalance = BN_ZERO;

    currentQuote?.feeInfo.feeComponent.forEach((feeItem) => {
      const asset = assetRegistryMap[feeItem.tokenSlug];

      if (asset) {
        const { decimals, priceId } = asset;
        const price = priceMap[priceId || ''] || 0;

        totalBalance = totalBalance.plus(new BigN(feeItem.amount).div(BN_TEN.pow(decimals || 0)).multipliedBy(price));
      }
    });

    return totalBalance;
  }, [assetRegistryMap, currentQuote?.feeInfo.feeComponent, priceMap]);

  const getConvertedBalance = useCallback((feeItem: SwapFeeComponent) => {
    const asset = assetRegistryMap[feeItem.tokenSlug];

    if (asset) {
      const { decimals, priceId } = asset;
      const price = priceMap[priceId || ''] || 0;

      return new BigN(feeItem.amount).div(BN_TEN.pow(decimals || 0)).multipliedBy(price);
    }

    return BN_ZERO;
  }, [assetRegistryMap, priceMap]);

  const feeItems = useMemo(() => {
    const result: FeeItem[] = [];
    const feeTypeMap: Record<SwapFeeType, FeeItem> = {
      NETWORK_FEE: { label: 'Network fee', value: new BigN(0), prefix: '$', type: SwapFeeType.NETWORK_FEE },
      PLATFORM_FEE: { label: 'Protocol fee', value: new BigN(0), prefix: '$', type: SwapFeeType.PLATFORM_FEE },
      WALLET_FEE: { label: 'Wallet commission', value: new BigN(0), suffix: '%', type: SwapFeeType.WALLET_FEE }
    };

    currentQuote?.feeInfo.feeComponent.forEach((feeItem) => {
      const { feeType } = feeItem;

      feeTypeMap[feeType].value = feeTypeMap[feeType].value.plus(getConvertedBalance(feeItem));
    });

    result.push(
      feeTypeMap.NETWORK_FEE,
      feeTypeMap.PLATFORM_FEE
    );

    return result;
  }, [currentQuote?.feeInfo.feeComponent, getConvertedBalance]);

  const canShowAvailableBalance = useMemo(() => {
    if (fromValue && chainValue && chainInfoMap[chainValue]) {
      return isEthereumAddress(fromValue) === _isChainEvmCompatible(chainInfoMap[chainValue]);
    }

    return false;
  }, [fromValue, chainValue, chainInfoMap]);

  const renderRateInfo = () => {
    if (!currentQuote) {
      return null;
    }

    return (
      <div className={'__quote-estimate-swap-value'}>
        <Number
          decimal={0}
          suffix={_getAssetSymbol(fromAssetInfo)}
          value={1}
        />
        <span>&nbsp;~&nbsp;</span>
        <Number
          customFormatter={swapCustomFormatter}
          decimal={0}
          formatType={'custom'}
          metadata={metadataInfo}
          suffix={_getAssetSymbol(toAssetInfo)}
          value={currentQuote.rate.toString()}
        />
      </div>
    );
  };

  const renderQuoteEmptyBlock = () => {
    const isError = !!swapError || isFormInvalid;
    let message = '';
    const _loading = handleRequestLoading && !isFormInvalid;

    if (isFormInvalid) {
      message = t('Please recheck form values');
    } else if (handleRequestLoading) {
      message = t('Loading...');
    } else {
      message = swapError ? swapError?.message : t('No routes available at this time. Please try a different pair.');
    }

    return (
      <div className={CN('__quote-empty-block')}>
        <div className='__quote-empty-icon-wrapper'>
          <div className={CN('__quote-empty-icon', {
            '-error': isError && !_loading
          })}
          >
            {
              _loading
                ? (
                  <ActivityIndicator size={32} />
                )
                : (
                  <Icon
                    customSize={'36px'}
                    phosphorIcon={isError ? XCircle : ListBullets}
                    weight={isError ? 'fill' : undefined}
                  />
                )
            }
          </div>
        </div>

        <div className={CN('__quote-empty-message', {
          '-loading': _loading
        })}
        >{message}</div>
      </div>
    );
  };

  const onError = useCallback(
    (error: Error) => {
      notify({
        message: error.message,
        type: 'error',
        duration: 8
      });

      dispatchProcessState({
        type: SwapActionType.STEP_ERROR_ROLLBACK,
        payload: error
      });
    },
    [notify]
  );

  const onSuccess = useCallback(
    (lastStep: boolean, needRollback: boolean): ((rs: SWTransactionResponse) => boolean) => {
      return (rs: SWTransactionResponse): boolean => {
        const { errors: _errors, id, warnings } = rs;

        if (_errors.length || warnings.length) {
          if (_errors[0]?.message !== 'Rejected by user') {
            if (
              _errors[0]?.message.startsWith('UnknownError Connection to Indexed DataBase server lost') ||
              _errors[0]?.message.startsWith('Provided address is invalid, the capitalization checksum test failed') ||
              _errors[0]?.message.startsWith('connection not open on send()')
            ) {
              notify({
                message: t('Your selected network has lost connection. Update it by re-enabling it or changing network provider'),
                type: 'error',
                duration: 8
              });

              return false;
            }

            // hideAll();
            onError(_errors[0]);

            return false;
          } else {
            dispatchProcessState({
              type: needRollback ? SwapActionType.STEP_ERROR_ROLLBACK : SwapActionType.STEP_ERROR,
              payload: _errors[0]
            });

            return false;
          }
        } else if (id) {
          dispatchProcessState({
            type: SwapActionType.STEP_COMPLETE,
            payload: rs
          });

          if (lastStep) {
            onDone(id);

            return false;
          }

          return true;
        } else {
          return false;
        }
      };
    },
    [notify, onDone, onError, t]
  );

  const onSubmit: FormCallbacks<SwapParams>['onFinish'] = useCallback((values: SwapParams) => {
    if (chainValue && !checkChainConnected(chainValue)) {
      openAlert({
        title: t('Pay attention!'),
        type: NotificationType.ERROR,
        content: t('Your selected network might have lost connection. Try updating it by either re-enabling it or changing network provider'),
        okButton: {
          text: t('I understand'),
          onClick: closeAlert,
          icon: CheckCircle
        }
      });

      return;
    }

    if (!currentQuote || !currentOptimalSwapPath) {
      return;
    }

    const account = findAccountByAddress(accounts, values.from);

    if (account?.isHardware) {
      notify({
        message: t('The account you are using is Ledger account, you cannot use this feature with it'),
        type: 'error',
        duration: 8
      });

      return;
    }

    setSubmitLoading(true);

    const { from, recipient } = values;

    const submitData = async (step: number): Promise<boolean> => {
      dispatchProcessState({
        type: SwapActionType.STEP_SUBMIT,
        payload: null
      });

      const isFirstStep = step === 0;
      const isLastStep = step === processState.steps.length - 1;
      const needRollback = step === 1;

      try {
        if (isFirstStep) {
          const validatePromise = validateSwapProcess({
            address: from,
            process: currentOptimalSwapPath,
            selectedQuote: currentQuote,
            recipient
          });

          const _errors = await validatePromise;

          if (_errors.length) {
            onError(_errors[0]);

            return false;
          } else {
            dispatchProcessState({
              type: SwapActionType.STEP_COMPLETE,
              payload: true
            });
            dispatchProcessState({
              type: SwapActionType.STEP_SUBMIT,
              payload: null
            });

            return await submitData(step + 1);
          }
        } else {
          const submitPromise: Promise<SWTransactionResponse> = handleSwapStep({
            process: currentOptimalSwapPath,
            currentStep: step,
            quote: currentQuote,
            address: from,
            slippage: currentSlippage,
            recipient
          });

          const rs = await submitPromise;
          const success = onSuccess(isLastStep, needRollback)(rs);

          if (success) {
            return await submitData(step + 1);
          } else {
            return false;
          }
        }
      } catch (e) {
        onError(e as Error);

        return false;
      }
    };

    setTimeout(() => {
      submitData(processState.currentStep)
        .catch(onError)
        .finally(() => {
          setSubmitLoading(false);
        });
    }, 300);
  }, [accounts, chainValue, checkChainConnected, closeAlert, currentOptimalSwapPath, currentQuote, currentSlippage, notify, onError, onSuccess, openAlert, processState.currentStep, processState.steps.length, t]);

  const destinationSwapValue = useMemo(() => {
    if (currentQuote) {
      const decimals = _getAssetDecimals(fromAssetInfo);

      return new BigN(currentQuote.fromAmount)
        .div(BN_TEN.pow(decimals))
        .multipliedBy(0.78);
    }

    return BN_ZERO;
  }, [currentQuote, fromAssetInfo]);

  const minimumReceived = useMemo(() => {
    return destinationSwapValue.multipliedBy(1 - currentSlippage);
  }, [destinationSwapValue, currentSlippage]);

  const onAfterConfirmTermModal = useCallback(() => {
    return setConfirmedTerm('swap-term-confirmed');
  }, [setConfirmedTerm]);

  const onViewQuoteDetail = useCallback(() => {
    setShowQuoteDetailOnMobile(true);
  }, []);

  const renderSlippage = () => {
    return (
      <>
        <div className='__slippage-action-wrapper'>
          <div
            className='__slippage-action'
            onClick={onOpenSlippageModal}
          >
            <Tooltip
              placement={'topRight'}
              title={'Chainflip uses Just In Time AMM to optimize swap quote without setting slippage'}
            >
              <div className={'__slippage-title-wrapper'}>Slippage
                <Icon
                  iconColor={token.colorSuccess}
                  phosphorIcon={Info}
                  size='sm'
                  weight='fill'
                />
            :</div>
            </Tooltip>
                    &nbsp;<span>{currentSlippage * 100}%</span>

            {supportSlippageSelection && (
              <div className='__slippage-editor-button'>
                <Icon
                  className='__slippage-editor-button-icon'
                  phosphorIcon={PencilSimpleLine}
                  size='sm'
                />
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  useEffect(() => {
    if (!isWebUI) {
      setBackProps((prev) => ({
        ...prev,
        onClick: showQuoteDetailOnMobile
          ? () => {
            setShowQuoteDetailOnMobile(false);
          }
          : null
      }));
    }
  }, [isWebUI, setBackProps, showQuoteDetailOnMobile]);

  useEffect(() => {
    if (!isWebUI) {
      setBackProps((prev) => ({
        ...prev,
        onClick: showQuoteDetailOnMobile
          ? () => {
            setShowQuoteDetailOnMobile(false);
          }
          : null
      }));
    }
  }, [isWebUI, setBackProps, showQuoteDetailOnMobile]);

  useEffect(() => {
    if (isWebUI) {
      setCustomScreenTitle(t('Swap'));
    } else {
      setCustomScreenTitle(showQuoteDetailOnMobile ? t('Swap quote detail') : t('Swap'));
    }

    return () => {
      if (isWebUI) {
        setCustomScreenTitle(undefined);
      }
    };
  }, [isWebUI, setCustomScreenTitle, showQuoteDetailOnMobile, t]);

  useEffect(() => {
    const chain = _getAssetOriginChain(fromAssetInfo);

    form.setFieldValue('chain', chain);
    persistData((prev) => ({
      ...prev,
      chain
    }));
  }, [form, fromAssetInfo, persistData]);

  useEffect(() => {
    let sync = true;
    let timeout: NodeJS.Timeout;

    // todo: simple validate before do this
    if (fromValue && fromTokenSlugValue && toTokenSlugValue && fromAmountValue && (!showRecipientField || recipientValue)) {
      timeout = setTimeout(() => {
        form.validateFields(['from', 'recipient']).then(() => {
          if (!sync) {
            return;
          }

          showQuoteAreaRef.current = true;
          setIsFormInvalid(false);
          setHandleRequestLoading(true);

          const currentRequest: SwapRequest = {
            address: fromValue,
            pair: {
              slug: _parseAssetRefKey(fromTokenSlugValue, toTokenSlugValue),
              from: fromTokenSlugValue,
              to: toTokenSlugValue
            },
            fromAmount: fromAmountValue,
            slippage: currentSlippage,
            recipient: recipientValue || undefined
          };

          setCurrentQuoteRequest(currentRequest);

          handleSwapRequest(currentRequest).then((result) => {
            if (sync) {
              setOptimalSwapPath(result.process);

              dispatchProcessState({
                payload: {
                  steps: result.process.steps,
                  feeStructure: result.process.totalFee
                },
                type: SwapActionType.STEP_CREATE
              });

              setQuoteOptions(result.quote.quotes);
              setCurrentQuote(result.quote.optimalQuote);
              setQuoteAliveUntil(result.quote.aliveUntil);
              setFeeOptions(result.quote.optimalQuote?.feeInfo?.feeOptions || []);
              setCurrentFeeOption(result.quote.optimalQuote?.feeInfo?.feeOptions?.[0]);
              setSwapError(result.quote.error);
              showQuoteAreaRef.current = true;
              optimalQuoteRef.current = result.quote.optimalQuote;
              setHandleRequestLoading(false);
            }
          }).catch((e) => {
            console.log('handleSwapRequest error', e);

            if (sync) {
              setHandleRequestLoading(false);
            }
          });
        }).catch((e) => {
          console.log('Error when validating', e);

          if (sync) {
            setIsFormInvalid(true);
          }
        });
      }, 300);
    }

    return () => {
      sync = false;
      clearTimeout(timeout);
    };
  }, [currentSlippage, form, fromAmountValue, fromTokenSlugValue, fromValue, recipientValue, showRecipientField, swapPairs, toTokenSlugValue]);

  useEffect(() => {
    let timer: NodeJS.Timer;

    if (quoteAliveUntil) {
      const updateQuoteCountdownTime = () => {
        const dateNow = Date.now();

        if (dateNow > quoteAliveUntil) {
          setQuoteCountdownTime(0);
          clearInterval(timer);
        } else {
          setQuoteCountdownTime(Math.round((quoteAliveUntil - dateNow) / 1000));
        }
      };

      timer = setInterval(updateQuoteCountdownTime, 1000);

      updateQuoteCountdownTime();
    } else {
      setQuoteCountdownTime(0);
    }

    return () => {
      clearInterval(timer);
    };
  }, [quoteAliveUntil]);

  useEffect(() => {
    let timer: NodeJS.Timer;
    let sync = true;

    const updateQuote = () => {
      if (currentQuoteRequest) {
        if (sync) {
          setHandleRequestLoading(true);
        }

        getLatestSwapQuote(currentQuoteRequest).then((rs) => {
          if (sync) {
            setCurrentQuote(rs.optimalQuote);
            setQuoteAliveUntil(rs.aliveUntil);
          }
        }).catch((e) => {
          console.log('Error when getLatestSwapQuote', e);
        }).finally(() => {
          if (sync) {
            setHandleRequestLoading(false);
          }
        });
      }
    };

    if (quoteAliveUntil) {
      timer = setInterval(() => {
        if (quoteAliveUntil < Date.now()) {
          updateQuote();
          clearInterval(timer);
        }
      }, 1000);
    }

    return () => {
      sync = false;
      clearInterval(timer);
    };
  }, [currentQuote, currentQuoteRequest, quoteAliveUntil]);

  useEffect(() => {
    if (!confirmedTerm) {
      activeModal(SWAP_TERMS_OF_SERVICE_MODAL);
    }
  }, [activeModal, confirmedTerm]);

  useEffect(() => {
    if (fromTokenItems.length) {
      if (!fromTokenSlugValue) {
        form.setFieldValue('fromTokenSlug', fromTokenItems[0].slug);
      } else {
        if (!fromTokenItems.some((i) => i.slug === fromTokenSlugValue)) {
          form.setFieldValue('fromTokenSlug', fromTokenItems[0].slug);
        }
      }
    }
  }, [form, fromTokenItems, fromTokenSlugValue, fromValue]);

  useEffect(() => {
    if (toTokenItems.length) {
      if (!toTokenSlugValue || !toTokenItems.some((t) => t.slug === toTokenSlugValue)) {
        form.setFieldValue('toTokenSlug', toTokenItems[0].slug);
      }
    }
  }, [form, toTokenItems, toTokenSlugValue]);

  const defaultFromValue = useMemo(() => {
    return currentAccount?.address ? isAccountAll(currentAccount.address) ? '' : currentAccount.address : '';
  }, [currentAccount?.address]);

  useEffect(() => {
    const restoreFormDefault = () => {
      persistData({
        ...DEFAULT_SWAP_PARAMS,
        from: defaultFromValue
      });
    };

    window.addEventListener('beforeunload', restoreFormDefault);

    return () => {
      window.removeEventListener('beforeunload', restoreFormDefault);
    };
  }, [defaultFromValue, persistData]);

  return (
    <>
      <>
        <div className={CN('__transaction-form-area', {
          '-init-animation': !showQuoteAreaRef.current,
          hidden: showQuoteDetailOnMobile
        })}
        >
          <TransactionContent>
            <>
              <Form
                className={'form-container'}
                form={form}
                initialValues={formDefault}
                onFieldsChange={onFieldsChange}
                onFinish={onSubmit}
              >
                <HiddenInput fields={hideFields} />

                <Form.Item
                  name={'from'}
                >
                  <AccountSelector
                    disabled={!isAllAccount}
                    label={t('Swap from account')}
                  />
                </Form.Item>

                <div className={'__balance-display-area'}>
                  <FreeBalance
                    address={fromValue}
                    chain={chainValue}
                    hidden={!canShowAvailableBalance}
                    isSubscribe={true}
                    label={`${t('Available balance')}:`}
                    tokenSlug={fromTokenSlugValue}
                  />
                </div>

                <div className={'__swap-field-area'}>
                  <SwapFromField
                    amountValue={fromAmountValue}
                    fromAsset={fromAssetInfo}
                    label={t('From')}
                    onChangeAmount={onChangeAmount}
                    onSelectToken={onSelectFromToken}
                    tokenSelectorItems={fromTokenItems}
                    tokenSelectorValue={fromTokenSlugValue}
                  />

                  <div className='__switch-side-container'>
                    <Button
                      className={'__switch-button'}
                      disabled={!isSwitchable}
                      icon={(
                        <Icon
                          customSize={'20px'}
                          phosphorIcon={ArrowsDownUp}
                          weight='fill'
                        />
                      )}
                      onClick={onSwitchSide}
                      shape='circle'
                      size='xs'
                      type={'ghost'}
                    >
                    </Button>
                  </div>

                  <SwapToField
                    loading={handleRequestLoading && showQuoteAreaRef.current}
                    onSelectToken={onSelectToToken}
                    swapValue={destinationSwapValue}
                    toAsset={toAssetInfo}
                    tokenSelectorItems={toTokenItems}
                    tokenSelectorValue={toTokenSlugValue}
                  />
                </div>

                {showRecipientField && (
                  <Form.Item
                    name={'recipient'}
                    rules={[
                      {
                        validator: recipientAddressValidator
                      }
                    ]}
                    statusHelpAsTooltip={isWebUI}
                    validateTrigger='onBlur'
                  >
                    <AddressInput
                      addressPrefix={destChainNetworkPrefix}
                      allowDomain={true}
                      chain={destChain}
                      label={t('Recipient account')}
                      networkGenesisHash={destChainGenesisHash}
                      placeholder={t('Input your recipient account')}
                      saveAddress={true}
                      showAddressBook={true}
                      showScanner={true}
                    />
                  </Form.Item>
                )}
              </Form>
              {
                (isWebUI || !showQuoteAreaRef.current) && renderSlippage()
              }

              {
                showQuoteAreaRef.current && !isWebUI && (
                  <>
                    {
                      !!currentQuote && !isFormInvalid && (
                        <MetaInfo
                          labelColorScheme={'gray'}
                          spaceSize={'sm'}
                          valueColorScheme={'light'}
                        >
                          <MetaInfo.Default
                            className={'__quote-rate'}
                            label={t('Quote rate')}
                            valueColorSchema={'gray'}
                          >
                            {
                              handleRequestLoading
                                ? (
                                  <ActivityIndicator />
                                )
                                : renderRateInfo()
                            }
                          </MetaInfo.Default>

                          <MetaInfo.Default
                            label={t('Estimated fee')}
                          >
                            {
                              handleRequestLoading
                                ? (
                                  <ActivityIndicator />
                                )
                                : (
                                  <Number
                                    decimal={0}
                                    prefix={'$'}
                                    value={estimatedFeeValue}
                                  />
                                )
                            }
                          </MetaInfo.Default>
                        </MetaInfo>
                      )
                    }

                    {
                      swapError && (
                        <div className={'__error-message'}>
                          {swapError.message}
                        </div>
                      )
                    }

                    {
                      !isFormInvalid && (
                        <div className='__view-quote-detail-action-wrapper'>
                          <div className={'__quote-reset-time'}>
                          Quote reset in: {quoteCountdownTime}s
                          </div>

                          <Button
                            className={'__view-quote-detail-button'}
                            onClick={onViewQuoteDetail}
                            size='xs'
                            type='ghost'
                          >
                            <span>{t('View swap quote')}</span>

                            <Icon
                              phosphorIcon={CaretRight}
                              size={'sm'}
                            />
                          </Button>
                        </div>
                      )
                    }
                  </>
                )
              }
            </>
          </TransactionContent>
          <TransactionFooter>
            <Button
              block={true}
              className={'__swap-submit-button'}
              disabled={submitLoading || handleRequestLoading}
              loading={submitLoading}
              onClick={form.submit}
            >
              {t('Swap')}
            </Button>
          </TransactionFooter>
        </div>

        <div className={CN('__transaction-swap-quote-info-area', {
          '-init-animation': !showQuoteAreaRef.current,
          hidden: !isWebUI && !showQuoteDetailOnMobile
        })}
        >
          <>
            <div className={'__quote-header-wrapper'}>
              <div className={'__header-left-part'}>
                <BackgroundIcon
                  backgroundColor='#004BFF'
                  className={'__quote-icon-info'}
                  iconColor='#fff'
                  phosphorIcon={Info}
                  weight={'fill'}
                />
                <div className={'__text'}>Swap quote</div>
              </div>
              <div className={'__header-right-part'}>
                <Button
                  className={'__view-quote-button'}
                  disabled={!quoteOptions.length || (handleRequestLoading || isFormInvalid)}
                  onClick={openAllQuotesModal}
                  size='xs'
                  type='ghost'
                >
                  <span>{t('View quote')}</span>

                  <Icon
                    phosphorIcon={CaretRight}
                    size={'sm'}
                  />
                </Button>
              </div>
            </div>

            {
              !!currentQuote && !handleRequestLoading && !isFormInvalid && (
                <MetaInfo
                  className={CN('__quote-info-block')}
                  hasBackgroundWrapper
                  labelColorScheme={'gray'}
                  spaceSize={'sm'}
                  valueColorScheme={'gray'}
                >
                  <MetaInfo.Default
                    className={'__quote-rate'}
                    label={t('Quote rate')}
                    valueColorSchema={'gray'}
                  >
                    {renderRateInfo()}
                  </MetaInfo.Default>

                  <MetaInfo.Default
                    className={'__swap-provider'}
                    label={t('Swap provider')}
                  >
                    <Logo
                      className='__provider-logo'
                      isShowSubLogo={false}
                      network={currentQuote.provider.id.toLowerCase()}
                      shape='squircle'
                      size={24}
                    />

                    {currentQuote.provider.name}
                  </MetaInfo.Default>

                  <MetaInfo.Default
                    className={'-d-column'}
                    label={t('Swap route')}
                  >
                  </MetaInfo.Default>
                  <SwapRoute swapRoute={currentQuote.route} />
                  <div className={'__minimum-received'}>
                    <MetaInfo.Number
                      customFormatter={swapCustomFormatter}
                      decimals={0}
                      formatType={'custom'}
                      label={
                        <Tooltip
                          placement={'topRight'}
                          title={'The least amount of token received based on slippage tolerance. Any amount less than this will make the transaction fail.'}
                        >
                          <div className={'__minimum-received-label'}>
                            <div>{t('Minimum received')}</div>
                            <Icon
                              iconColor={token.colorTextTertiary}
                              phosphorIcon={Info}
                              size='sm'
                              weight='fill'
                            />
                          </div>
                        </Tooltip>
                      }
                      metadata={metadataInfo}
                      suffix={_getAssetSymbol(toAssetInfo)}
                      value={minimumReceived.toString()}
                    />
                  </div>
                </MetaInfo>
              )
            }

            {
              (!currentQuote || handleRequestLoading || isFormInvalid) && renderQuoteEmptyBlock()
            }
            <div className={'__quote-and-slippage'}>
              <>
                {
                  !handleRequestLoading && !isFormInvalid && (
                    <div className={'__quote-reset-time'}>
                    Quote reset in: {quoteCountdownTime}s
                    </div>
                  )
                }
                {
                  !handleRequestLoading && !isWebUI && renderSlippage()
                }
              </>
            </div>

            {
              !!currentQuote && !handleRequestLoading && !isFormInvalid && (
                <MetaInfo
                  className={CN('__quote-fee-info-block')}
                  hasBackgroundWrapper
                  labelColorScheme={'gray'}
                  spaceSize={'xs'}
                  valueColorScheme={'gray'}
                >
                  <MetaInfo.Number
                    className={'__total-fee-value'}
                    customFormatter={swapCustomFormatter}
                    decimals={0}
                    formatType={'custom'}
                    label={t('Estimated fee')}
                    metadata = {metadataInfo}
                    onClickValue={onToggleFeeDetails}
                    prefix={'$'}
                    suffixNode={
                      <Icon
                        className={'__estimated-fee-button'}
                        customSize={'20px'}
                        phosphorIcon={isViewFeeDetails ? CaretUp : CaretDown}
                      />
                    }
                    value={estimatedFeeValue}
                  />

                  {
                    isViewFeeDetails && (
                      <div className={'__quote-fee-details-block'}>
                        {feeItems.map((item) => (
                          <MetaInfo.Number
                            decimals={0}
                            key={item.type}
                            label={t(item.label)}
                            prefix={item.prefix}
                            suffix={item.suffix}
                            value={item.value}
                          />
                        ))}
                      </div>
                    )
                  }

                  <div className={'__separator'}></div>
                  <div className={'__fee-paid-wrapper'}>
                    <div className={'__fee-paid-label'}>Fee paid in</div>
                    <div
                      className={'__fee-paid-token'}
                      onClick={openChooseFeeToken}
                    >
                      <Logo
                        className='token-logo'
                        isShowSubLogo={false}
                        shape='circle'
                        size={24}
                        token={currentQuote.pair.from.toLowerCase()}
                      />
                      <div className={'__fee-paid-token-symbol'}>{_getAssetSymbol(feeAssetInfo)}</div>
                      <Icon
                        className={'__edit-token'}
                        customSize={'20px'}
                        phosphorIcon={PencilSimpleLine}
                      />
                    </div>
                  </div>
                </MetaInfo>
              )
            }
          </>
        </div>
      </>

      <ChooseFeeTokenModal
        estimatedFee={estimatedFeeValue}
        items={feeOptions}
        modalId={SWAP_CHOOSE_FEE_TOKEN_MODAL}
        onSelectItem={onSelectFeeOption}
        selectedItem={currentFeeOption}
      />
      <SlippageModal
        modalId={SWAP_SLIPPAGE_MODAL}
        onApplySlippage={onSelectSlippage}
      />
      <AddMoreBalanceModal
        modalId={SWAP_MORE_BALANCE_MODAL}
      />
      <SwapQuotesSelectorModal
        items={quoteOptions}
        modalId={SWAP_ALL_QUOTES_MODAL}
        onSelectItem={onSelectQuote}
        optimalQuoteItem={optimalQuoteRef.current}
        selectedItem={currentQuote}
      />
      <SwapTeamsOfServiceModal onOk={onAfterConfirmTermModal} />
    </>
  );
};

const Wrapper: React.FC<Props> = (props: Props) => {
  const { className } = props;
  const dataContext = useContext(DataContext);
  const { setWebBaseClassName } = useContext(WebUIContext);
  const { isWebUI } = useContext(ScreenContext);

  useEffect(() => {
    setWebBaseClassName(`${className || ''}-web-base-container`);

    return () => {
      setWebBaseClassName('');
    };
  }, [className, setWebBaseClassName]);

  return (
    <PageWrapper
      className={CN(className, { '-desktop': isWebUI, '-mobile': !isWebUI })}
      resolve={dataContext.awaitStores(['swap', 'price'])}
    >
      <Component />
    </PageWrapper>
  );
};

const Swap = styled(Wrapper)<Props>(({ theme: { token } }: Props) => {
  return {
    '.__fee-paid-wrapper': {
      color: token.colorTextTertiary,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      cursor: 'pointer'
    },
    '.__fee-paid-token': {
      display: 'flex',
      alignItems: 'center'
    },
    '.__fee-paid-token-symbol': {
      paddingLeft: 8,
      color: token.colorWhite
    },
    '.__quote-icon-info': {
      fontSize: 16,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    },
    '.__swap-provider .__value ': {
      display: 'flex',
      gap: 8
    },
    '.ant-background-icon': {
      width: 24,
      height: 24
    },
    '.__view-quote-button': {
      paddingLeft: 0,
      paddingRight: 0,
      color: token.colorTextTertiary
    },
    '.__minimum-received-label': {
      display: 'flex',
      cursor: 'pointer'
    },
    '.__view-quote-button > span+.anticon': {
      marginInlineStart: 0,
      width: 40
    },

    '.__view-quote-button:hover': {
      color: token.colorWhite
    },

    '.__slippage-action-wrapper': {
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'center',
      color: token.colorSuccess
    },
    '.__slippage-action': {
      cursor: 'pointer',
      alignItems: 'center',
      display: 'flex'
    },
    '.__quote-reset-time': {
      color: token.colorWarningText,
      display: 'flex',
      justifyContent: 'flex-end',
      paddingLeft: token.paddingXS,
      paddingRight: token.paddingXS,
      marginBottom: token.margin,
      marginTop: token.marginXXS,
      fontSize: token.fontSize,
      fontWeight: token.bodyFontWeight,
      lineHeight: token.lineHeight
    },
    '.__slippage-editor-button': {
      paddingLeft: token.paddingXXS
    },
    '.__estimated-fee-button': {
      paddingLeft: token.paddingXXS
    },
    '.__edit-token': {
      paddingLeft: token.paddingXXS
    },

    '.free-balance': {
      marginBottom: token.marginSM
    },

    // swap quote
    '.__quote-estimate-swap-value': {
      display: 'flex'
    },
    '.__quote-rate .__value': {
      fontSize: token.fontSize,
      fontWeight: token.bodyFontWeight,
      lineHeight: token.lineHeight,
      color: token.colorWhite
    },
    '.__swap-provider .__value': {
      fontSize: token.fontSize,
      fontWeight: token.bodyFontWeight,
      lineHeight: token.lineHeight,
      color: token.colorWhite
    },

    '.__quote-info-block, __quote-fee-info-block': {
      paddingLeft: 24,
      paddingRight: 24,
      paddingTop: 16,
      paddingBottom: 16
    },

    '.__quote-empty-block': {
      background: token.colorBgSecondary,
      borderRadius: token.borderRadiusLG,
      paddingBottom: token.paddingLG,
      paddingLeft: token.paddingLG,
      paddingRight: token.paddingLG,
      paddingTop: token.paddingXL,
      textAlign: 'center',
      gap: token.size,
      minHeight: 184
    },

    '.__quote-empty-icon-wrapper': {
      display: 'flex',
      justifyContent: 'center',
      marginBottom: token.margin
    },

    '.__quote-empty-icon': {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      width: 64,
      height: 64,
      position: 'relative',

      '&:before': {
        content: "''",
        position: 'absolute',
        inset: 0,
        borderRadius: '100%',
        backgroundColor: token['gray-4'],
        opacity: 0.1,
        zIndex: 0
      },

      '.anticon': {
        position: 'relative',
        zIndex: 1,
        color: token.colorTextLight3
      }
    },

    '.__quote-empty-icon.-error': {
      '&:before': {
        backgroundColor: token.colorError
      },

      '.anticon': {
        color: token.colorError
      }
    },

    '.__quote-empty-message': {
      color: token.colorWhite,
      fontSize: token.fontSize,
      fontWeight: token.bodyFontWeight,
      lineHeight: token.lineHeight
    },

    '.__quote-empty-message.-loading': {
      color: token.colorTextLight4
    },

    '.__total-fee-value': {
      fontSize: token.fontSize,
      lineHeight: token.lineHeight,
      fontWeight: token.bodyFontWeight,
      color: token.colorTextLight2,

      '.ant-number-integer': {
        color: `${token.colorTextLight2} !important`,
        fontSize: 'inherit !important',
        fontWeight: 'inherit !important',
        lineHeight: 'inherit'
      },

      '.ant-number-decimal, .ant-number-prefix': {
        color: `${token.colorTextLight2} !important`,
        fontSize: `${token.fontSize}px !important`,
        fontWeight: 'inherit !important',
        lineHeight: token.colorTextLight2
      }
    },
    '.__quote-fee-details-block': {
      marginTop: token.marginXS,
      paddingLeft: token.paddingXS,
      fontSize: token.fontSize,
      lineHeight: token.lineHeight,
      fontWeight: token.bodyFontWeight,
      color: token.colorWhite,

      '.ant-number-integer': {
        color: `${token.colorWhite} !important`,
        fontSize: 'inherit !important',
        fontWeight: 'inherit !important',
        lineHeight: 'inherit'
      },

      '.ant-number-decimal, .ant-number-prefix': {
        color: `${token.colorWhite} !important`,
        fontSize: `${token.fontSize}px !important`,
        fontWeight: 'inherit !important',
        lineHeight: token.colorTextLight2
      }
    },
    '.__separator': {
      height: 2,
      opacity: 0.8,
      backgroundColor: token.colorBgBorder,
      marginTop: 12,
      marginBottom: 12
    },

    '.__quote-header-wrapper': {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
      marginTop: -7
    },
    '.__header-left-part': {
      display: 'flex',
      gap: 8,
      alignItems: 'center'
    },

    '.__header-right-part': {
      display: 'flex',
      alignItems: 'center'
    },

    '.__transaction-form-area .ant-form-item': {
      marginBottom: 12
    },

    '.__token-selector-wrapper .ant-select-modal-input-wrapper': {
      color: token.colorWhite,
      paddingLeft: 16
    },
    '.__token-selector-wrapper': {
      flex: 1,
      overflow: 'hidden',
      minWidth: 160,
      maxWidth: 182
    },
    '.__minimum-received': {
      marginTop: 12
    },
    '.__minimum-received .__label-col': {
      fontSize: 14,
      fontWeight: token.bodyFontWeight,
      lineHeight: token.lineHeight,
      color: token.colorTextTertiary
    },
    '.__minimum-received .__value': {
      fontSize: 14,
      fontWeight: token.bodyFontWeight,
      lineHeight: token.lineHeight,
      color: token.colorWhite
    },
    '.__slippage-title-wrapper': {
      display: 'flex',
      alignItems: 'center'
    },

    '.__switch-side-container': {
      position: 'relative',
      '.__switch-button': {
        position: 'absolute',
        backgroundColor: token['gray-2'],
        borderRadius: '50%',
        alignItems: 'center',
        bottom: -16,
        marginLeft: -20,
        left: '50%',
        display: 'flex',
        justifyContent: 'center'
      }
    },

    // desktop

    '.web-ui-enable &': {
      // todo: use react solution, not CSS, to hide the back button
      '.title-group .ant-btn': {
        display: 'none'
      }
    },

    '&.-desktop': {
      display: 'flex',
      flexDirection: 'row',
      maxWidth: 784,
      width: '100%',
      marginLeft: 'auto',
      marginRight: 'auto',
      gap: token.size,

      '.__transaction-form-area': {
        overflowX: 'hidden',
        flex: 1,
        transition: 'transform 0.3s ease-in-out'
      },

      '.__transaction-form-area .transaction-footer': {
        paddingTop: 0,
        paddingBottom: 0,
        paddingRight: 0,
        paddingLeft: 0
      },
      '.__transaction-form-area .transaction-content': {
        paddingRight: 0,
        paddingLeft: 0
      },

      '.__transaction-swap-quote-info-area': {
        overflowX: 'hidden',
        flex: 1,
        transition: 'transform 0.3s ease-out, opacity 0.6s ease-out',
        transitionDelay: '0.1s'
      },
      '.__transaction-swap-quote-info-area.-init-animation': {
        transform: 'translateX(-10%)',
        opacity: 0,
        zIndex: 1,
        pointerEvents: 'none'
      },
      '.__transaction-form-area.-init-animation': {
        transform: 'translateX(50%)',
        zIndex: 2
      },
      '.__slippage-action-wrapper': {
        marginBottom: 24
      }
    },

    // desktop

    '&.-mobile': {
      overflow: 'auto',
      height: '100%',

      '.__transaction-form-area': {
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      },

      '.__quote-reset-time': {
        marginBottom: 0,
        alignItems: 'center',
        marginTop: 0,
        paddingLeft: 0
      },
      '.transaction-footer': {
        paddingTop: 16
      },
      '.__slippage-action-wrapper': {
        fontSize: 14,
        fontWeight: token.bodyFontWeight,
        lineHeight: token.lineHeight
      },
      '.__view-quote-detail-action-wrapper': {
        display: 'flex',
        justifyContent: 'space-between'
      },
      '.__view-quote-detail-button': {
        paddingRight: 0
      },
      '.__swap-route.__row': {
        marginTop: 8
      },
      '.__quote-fee-info-block': {
        marginTop: 16
      },
      '.__quote-info-block': {
        marginBottom: 4
      },
      '.__error-message': {
        color: token.colorError,
        fontSize: token.fontSizeSM,
        fontWeight: token.bodyFontWeight,
        lineHeight: token.lineHeightSM,
        marginTop: -token.marginXXS,
        paddingBottom: token.padding
      },
      '.__quote-and-slippage': {
        display: 'flex',
        justifyContent: 'space-between'
      },
      '.__transaction-swap-quote-info-area': {
        paddingLeft: token.padding,
        paddingRight: token.padding
      }
    }
  };
});

export default Swap;
