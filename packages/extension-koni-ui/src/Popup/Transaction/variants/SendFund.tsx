// Copyright 2019-2022 @polkadot/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _AssetRef, _AssetType, _ChainAsset, _ChainInfo } from '@subwallet/chain-list/types';
import { ExtrinsicType, NotificationType } from '@subwallet/extension-base/background/KoniTypes';
import { TransactionWarning } from '@subwallet/extension-base/background/warnings/TransactionWarning';
import { validateRecipientAddress } from '@subwallet/extension-base/core/logic-validation/recipientAddress';
import { _getXcmUnstableWarning, _isMythosFromHydrationToMythos, _isXcmTransferUnstable } from '@subwallet/extension-base/core/substrate/xcm-parser';
import { ActionType } from '@subwallet/extension-base/core/types';
import { getAvailBridgeGatewayContract, getSnowBridgeGatewayContract } from '@subwallet/extension-base/koni/api/contract-handler/utils';
import { isAvailChainBridge } from '@subwallet/extension-base/services/balance-service/transfer/xcm/availBridge';
import { _isPolygonChainBridge } from '@subwallet/extension-base/services/balance-service/transfer/xcm/polygonBridge';
import { _isPosChainBridge, _isPosChainL2Bridge } from '@subwallet/extension-base/services/balance-service/transfer/xcm/posBridge';
import { _getAssetDecimals, _getAssetName, _getAssetOriginChain, _getAssetSymbol, _getContractAddressOfToken, _getMultiChainAsset, _getOriginChainOfAsset, _getTokenMinAmount, _isChainEvmCompatible, _isNativeToken, _isTokenTransferredByEvm } from '@subwallet/extension-base/services/chain-service/utils';
import { TON_CHAINS } from '@subwallet/extension-base/services/earning-service/constants';
import { SWTransactionResponse } from '@subwallet/extension-base/services/transaction-service/types';
import { AccountChainType, AccountProxy, AccountProxyType, AccountSignMode, AnalyzedGroup, BasicTxWarningCode } from '@subwallet/extension-base/types';
import { CommonStepType } from '@subwallet/extension-base/types/service-base';
import { _reformatAddressWithChain, detectTranslate, isAccountAll } from '@subwallet/extension-base/utils';
import { AccountAddressSelector, AddressInputNew, AddressInputRef, AlertBox, AlertModal, AmountInput, ChainSelector, HiddenInput, TokenItemType, TokenSelector } from '@subwallet/extension-koni-ui/components';
import { ADDRESS_INPUT_AUTO_FORMAT_VALUE } from '@subwallet/extension-koni-ui/constants';
import { MktCampaignModalContext } from '@subwallet/extension-koni-ui/contexts/MktCampaignModalContext';
import { useAlert, useDefaultNavigate, useFetchChainAssetInfo, useHandleSubmitMultiTransaction, useNotification, usePreCheckAction, useRestoreTransaction, useSelector, useSetCurrentPage, useTransactionContext, useWatchTransaction } from '@subwallet/extension-koni-ui/hooks';
import useGetConfirmationByScreen from '@subwallet/extension-koni-ui/hooks/campaign/useGetConfirmationByScreen';
import { approveSpending, getMaxTransfer, getOptimalTransferProcess, isTonBounceableAddress, makeCrossChainTransfer, makeTransfer } from '@subwallet/extension-koni-ui/messaging';
import { CommonActionType, commonProcessReducer, DEFAULT_COMMON_PROCESS } from '@subwallet/extension-koni-ui/reducer';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import { AccountAddressItemType, ChainItemType, FormCallbacks, Theme, ThemeProps, TransferParams } from '@subwallet/extension-koni-ui/types';
import { findAccountByAddress, formatBalance, getChainsByAccountAll, getChainsByAccountType, getReformatedAddressRelatedToChain, noop } from '@subwallet/extension-koni-ui/utils';
import { Button, Form, Icon } from '@subwallet/react-ui';
import { Rule } from '@subwallet/react-ui/es/form';
import BigN from 'bignumber.js';
import CN from 'classnames';
import { PaperPlaneRight, PaperPlaneTilt } from 'phosphor-react';
import React, { useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { useIsFirstRender, useLocalStorage } from 'usehooks-ts';

import { BN, BN_ZERO } from '@polkadot/util';

import { FreeBalance, TransactionContent, TransactionFooter } from '../parts';

type WrapperProps = ThemeProps;

type ComponentProps = {
  className?: string;
  targetAccountProxy: AccountProxy;
  isAllAccount?: boolean
};

interface TransferOptions {
  isTransferAll: boolean;
  isTransferBounceable: boolean;
}

function getTokenItems (
  accountProxy: AccountProxy,
  accountProxies: AccountProxy[],
  chainInfoMap: Record<string, _ChainInfo>,
  assetRegistry: Record<string, _ChainAsset>,
  tokenGroupSlug?: string // is ether a token slug or a multiChainAsset slug
): TokenItemType[] {
  let allowedChains: string[];

  if (!isAccountAll(accountProxy.id)) {
    allowedChains = getChainsByAccountType(chainInfoMap, accountProxy.chainTypes, accountProxy.specialChain);
  } else {
    allowedChains = getChainsByAccountAll(accountProxy, accountProxies, chainInfoMap);
  }

  const items: TokenItemType[] = [];

  Object.values(assetRegistry).forEach((chainAsset) => {
    const originChain = _getAssetOriginChain(chainAsset);

    if (!allowedChains.includes(originChain)) {
      return;
    }

    if (!tokenGroupSlug || (chainAsset.slug === tokenGroupSlug || _getMultiChainAsset(chainAsset) === tokenGroupSlug)) {
      items.push({
        slug: chainAsset.slug,
        name: _getAssetName(chainAsset),
        symbol: _getAssetSymbol(chainAsset),
        originChain
      });
    }
  });

  return items;
}

function getTokenAvailableDestinations (tokenSlug: string, xcmRefMap: Record<string, _AssetRef>, chainInfoMap: Record<string, _ChainInfo>): ChainItemType[] {
  if (!tokenSlug) {
    return [];
  }

  const result: ChainItemType[] = [];
  const originChain = chainInfoMap[_getOriginChainOfAsset(tokenSlug)];

  // Firstly, push the originChain of token
  result.push({
    name: originChain.name,
    slug: originChain.slug
  });

  Object.values(xcmRefMap).forEach((xcmRef) => {
    if (xcmRef.srcAsset === tokenSlug) {
      const destinationChain = chainInfoMap[xcmRef.destChain];

      result.push({
        name: destinationChain.name,
        slug: destinationChain.slug
      });
    }
  });

  return result;
}

const hiddenFields: Array<keyof TransferParams> = ['chain', 'fromAccountProxy', 'defaultSlug'];
const alertModalId = 'confirmation-alert-modal';
const substrateAccountSlug = 'polkadot-NATIVE-DOT';
const evmAccountSlug = 'ethereum-NATIVE-ETH';
const tonAccountSlug = 'ton-NATIVE-TON';
const defaultAddressInputRenderKey = 'address-input-render-key';

const Component = ({ className = '', isAllAccount, targetAccountProxy }: ComponentProps): React.ReactElement<ComponentProps> => {
  useSetCurrentPage('/transaction/send-fund');
  const { t } = useTranslation();
  const notification = useNotification();
  const mktCampaignModalContext = useContext(MktCampaignModalContext);

  const { defaultData, persistData } = useTransactionContext<TransferParams>();
  const { defaultSlug: sendFundSlug } = defaultData;
  const isFirstRender = useIsFirstRender();

  const [form] = Form.useForm<TransferParams>();
  const formDefault = useMemo((): TransferParams => {
    return {
      ...defaultData
    };
  }, [defaultData]);

  const destChainValue = useWatchTransaction('destChain', form, defaultData);
  const transferAmountValue = useWatchTransaction('value', form, defaultData);
  const fromValue = useWatchTransaction('from', form, defaultData);
  const chainValue = useWatchTransaction('chain', form, defaultData);
  const assetValue = useWatchTransaction('asset', form, defaultData);

  const assetInfo = useFetchChainAssetInfo(assetValue);
  const { alertProps, closeAlert, openAlert } = useAlert(alertModalId);

  const { chainInfoMap, chainStateMap, chainStatusMap, ledgerGenericAllowNetworks } = useSelector((root) => root.chainStore);
  const { assetRegistry, xcmRefMap } = useSelector((root) => root.assetRegistry);
  const { accounts } = useSelector((state: RootState) => state.accountState);
  const accountProxies = useSelector((state: RootState) => state.accountState.accountProxies);
  const [autoFormatValue] = useLocalStorage(ADDRESS_INPUT_AUTO_FORMAT_VALUE, false);

  const [maxTransfer, setMaxTransfer] = useState<string>('0');
  const { getCurrentConfirmation, renderConfirmationButtons } = useGetConfirmationByScreen('send-fund');
  const checkAction = usePreCheckAction(fromValue, true, detectTranslate('The account you are using is {{accountTitle}}, you cannot send assets with it'));

  const currentConfirmation = useMemo(() => {
    if (chainValue && destChainValue) {
      return getCurrentConfirmation([chainValue, destChainValue]);
    } else {
      return undefined;
    }
  }, [chainValue, destChainValue, getCurrentConfirmation]);

  const hideMaxButton = useMemo(() => {
    const chainInfo = chainInfoMap[chainValue];

    if (_isPolygonChainBridge(chainValue, destChainValue) || _isPosChainBridge(chainValue, destChainValue)) {
      return true;
    }

    return !!chainInfo && !!assetInfo && _isChainEvmCompatible(chainInfo) && destChainValue === chainValue && _isNativeToken(assetInfo);
  }, [chainInfoMap, chainValue, destChainValue, assetInfo]);

  const disabledToAddressInput = useMemo(() => {
    if (_isPosChainL2Bridge(chainValue, destChainValue)) {
      return true;
    }

    return false;
  }, [chainValue, destChainValue]);

  const [loading, setLoading] = useState(false);
  const [isTransferAll, setIsTransferAll] = useState(false);

  // use this to reinit AddressInput component
  const [addressInputRenderKey, setAddressInputRenderKey] = useState<string>(defaultAddressInputRenderKey);

  const [, update] = useState({});
  const [isFetchingMaxValue, setIsFetchingMaxValue] = useState(false);
  const [isBalanceReady, setIsBalanceReady] = useState(true);
  const [forceUpdateMaxValue, setForceUpdateMaxValue] = useState<object|undefined>(undefined);
  const chainStatus = useMemo(() => chainStatusMap[chainValue]?.connectionStatus, [chainValue, chainStatusMap]);

  const [processState, dispatchProcessState] = useReducer(commonProcessReducer, DEFAULT_COMMON_PROCESS);

  const handleWarning = useCallback((warnings: TransactionWarning[]) => {
    if (warnings.some((w) => w.warningType === BasicTxWarningCode.NOT_ENOUGH_EXISTENTIAL_DEPOSIT)) {
      setForceUpdateMaxValue({});
      setIsTransferAll(true);
    }
  }, []);

  const { onError, onSuccess } = useHandleSubmitMultiTransaction(dispatchProcessState, handleWarning);

  const destChainItems = useMemo<ChainItemType[]>(() => {
    return getTokenAvailableDestinations(assetValue, xcmRefMap, chainInfoMap);
  }, [chainInfoMap, assetValue, xcmRefMap]);

  const currentChainAsset = useMemo(() => {
    const _asset = isFirstRender ? defaultData.asset : assetValue;

    return _asset ? assetRegistry[_asset] : undefined;
  }, [isFirstRender, defaultData.asset, assetValue, assetRegistry]);

  const decimals = useMemo(() => {
    return currentChainAsset ? _getAssetDecimals(currentChainAsset) : 0;
  }, [currentChainAsset]);

  const extrinsicType = useMemo((): ExtrinsicType => {
    if (!currentChainAsset) {
      return ExtrinsicType.UNKNOWN;
    } else {
      if (chainValue !== destChainValue) {
        return ExtrinsicType.TRANSFER_XCM;
      } else {
        if (currentChainAsset.assetType === _AssetType.NATIVE) {
          return ExtrinsicType.TRANSFER_BALANCE;
        } else {
          return ExtrinsicType.TRANSFER_TOKEN;
        }
      }
    }
  }, [chainValue, currentChainAsset, destChainValue]);

  const tokenItems = useMemo<TokenItemType[]>(() => {
    return getTokenItems(
      targetAccountProxy,
      accountProxies,
      chainInfoMap,
      assetRegistry,
      sendFundSlug
    );
  }, [accountProxies, assetRegistry, chainInfoMap, sendFundSlug, targetAccountProxy]);

  const accountAddressItems = useMemo(() => {
    const chainInfo = chainValue ? chainInfoMap[chainValue] : undefined;

    if (!chainInfo) {
      return [];
    }

    const result: AccountAddressItemType[] = [];

    const updateResult = (ap: AccountProxy) => {
      ap.accounts.forEach((a) => {
        const address = getReformatedAddressRelatedToChain(a, chainInfo);

        if (address) {
          result.push({
            accountName: ap.name,
            accountProxyId: ap.id,
            accountProxyType: ap.accountType,
            accountType: a.type,
            address
          });
        }
      });
    };

    if (isAccountAll(targetAccountProxy.id)) {
      accountProxies.forEach((ap) => {
        if (isAccountAll(ap.id)) {
          return;
        }

        if ([AccountProxyType.READ_ONLY].includes(ap.accountType)) {
          return;
        }

        updateResult(ap);
      });
    } else {
      updateResult(targetAccountProxy);
    }

    return result;
  }, [accountProxies, chainInfoMap, chainValue, targetAccountProxy]);

  const isNotShowAccountSelector = !isAllAccount && accountAddressItems.length < 2;

  const addressInputRef = useRef<AddressInputRef>(null);
  const addressInputCurrent = addressInputRef.current;

  const updateAddressInputValue = useCallback((value: string) => {
    addressInputCurrent?.setInputValue(value);
    addressInputCurrent?.setSelectedOption((prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        formatedAddress: value
      };
    });
  }, [addressInputCurrent]);

  const validateRecipient = useCallback((rule: Rule, _recipientAddress: string): Promise<void> => {
    const { chain, destChain, from } = form.getFieldsValue();
    const destChainInfo = chainInfoMap[destChain];
    const account = findAccountByAddress(accounts, _recipientAddress);

    return validateRecipientAddress({ srcChain: chain,
      destChainInfo,
      fromAddress: from,
      toAddress: _recipientAddress,
      account,
      actionType: ActionType.SEND_FUND,
      autoFormatValue,
      allowLedgerGenerics: ledgerGenericAllowNetworks });
  }, [accounts, autoFormatValue, chainInfoMap, form, ledgerGenericAllowNetworks]);

  const validateAmount = useCallback((rule: Rule, amount: string): Promise<void> => {
    if (!amount) {
      return Promise.reject(t('Amount is required'));
    }

    if ((new BN(maxTransfer)).lte(BN_ZERO)) {
      return Promise.reject(t('You don\'t have enough tokens to proceed'));
    }

    if ((new BigN(amount)).eq(new BigN(0))) {
      return Promise.reject(t('Amount must be greater than 0'));
    }

    if ((new BigN(amount)).gt(new BigN(maxTransfer))) {
      const maxString = formatBalance(maxTransfer, decimals);

      return Promise.reject(t('Amount must be equal or less than {{number}}', { replace: { number: maxString } }));
    }

    return Promise.resolve();
  }, [decimals, maxTransfer, t]);

  const onValuesChange: FormCallbacks<TransferParams>['onValuesChange'] = useCallback(
    (part: Partial<TransferParams>, values: TransferParams) => {
      const validateField: Set<string> = new Set();

      if (part.asset) {
        const chain = assetRegistry[part.asset].originChain;

        form.setFieldsValue({
          chain: chain,
          destChain: chain,
          to: ''
        });

        setAddressInputRenderKey(`${defaultAddressInputRenderKey}-${Date.now()}`);
        setIsTransferAll(false);
        setForceUpdateMaxValue(undefined);
      }

      if (part.destChain || part.chain || part.value || part.asset) {
        form.setFields([
          {
            name: 'to',
            errors: []
          },
          {
            name: 'value',
            errors: []
          }
        ]);
      }

      if (part.destChain) {
        form.resetFields(['to']);
      }

      if (part.from || part.destChain) {
        setForceUpdateMaxValue(isTransferAll ? {} : undefined);
      }

      if (part.to) {
        form.setFields([
          {
            name: 'to',
            errors: []
          }
        ]);
      }

      if (validateField.size) {
        form.validateFields([...validateField]).catch(noop);
      }

      persistData(form.getFieldsValue());
    },
    [persistData, form, assetRegistry, isTransferAll]
  );

  const isShowWarningOnSubmit = useCallback((values: TransferParams): boolean => {
    setLoading(true);
    const { asset, chain, destChain, from: _from } = values;

    const account = findAccountByAddress(accounts, _from);

    if (!account) {
      setLoading(false);
      notification({
        message: t("Can't find account"),
        type: 'error'
      });

      return true;
    }

    const chainAsset = assetRegistry[asset];

    if (chain === destChain) {
      if (account.signMode === AccountSignMode.GENERIC_LEDGER && account.chainType === 'ethereum') {
        if (!_isTokenTransferredByEvm(chainAsset)) {
          setLoading(false);
          notification({
            message: t('Ledger does not support transfer for this token'),
            type: 'warning'
          });

          return true;
        }
      }
    }

    return false;
  }, [accounts, assetRegistry, notification, t]);

  const handleBasicSubmit = useCallback((values: TransferParams, options: TransferOptions): Promise<SWTransactionResponse> => {
    const { asset, chain, destChain, from, to, value } = values;
    let sendPromise: Promise<SWTransactionResponse>;

    if (chain === destChain) {
      // Transfer token or send fund
      sendPromise = makeTransfer({
        from,
        networkKey: chain,
        to: to,
        tokenSlug: asset,
        value: value,
        transferAll: options.isTransferAll,
        transferBounceable: options.isTransferBounceable
      });
    } else {
      // Make cross chain transfer
      sendPromise = makeCrossChainTransfer({
        destinationNetworkKey: destChain,
        from,
        originNetworkKey: chain,
        tokenSlug: asset,
        to,
        value,
        transferAll: options.isTransferAll,
        transferBounceable: options.isTransferBounceable
      });
    }

    return sendPromise;
  }, []);

  // todo: must refactor later, temporary solution to support SnowBridge
  const handleBridgeSpendingApproval = useCallback((values: TransferParams): Promise<SWTransactionResponse> => {
    const isAvailBridge = isAvailChainBridge(values.destChain);

    const tokenInfo = assetRegistry[values.asset];

    return approveSpending({
      amount: values.value,
      contractAddress: _getContractAddressOfToken(tokenInfo),
      spenderAddress: isAvailBridge ? getAvailBridgeGatewayContract(values.chain) : getSnowBridgeGatewayContract(values.chain),
      chain: values.chain,
      owner: values.from
    });
  }, [assetRegistry]);

  // Submit transaction
  const doSubmit = useCallback((values: TransferParams, options: TransferOptions) => {
    if (isShowWarningOnSubmit(values)) {
      return;
    }

    const submitData = async (step: number): Promise<boolean> => {
      dispatchProcessState({
        type: CommonActionType.STEP_SUBMIT,
        payload: null
      });

      const isFirstStep = step === 0;
      const isLastStep = step === processState.steps.length - 1;
      const needRollback = step === 1;

      try {
        if (isFirstStep) {
          // todo: validate process
          dispatchProcessState({
            type: CommonActionType.STEP_COMPLETE,
            payload: true
          });
          dispatchProcessState({
            type: CommonActionType.STEP_SUBMIT,
            payload: null
          });

          return await submitData(step + 1);
        } else {
          const stepType = processState.steps[step].type;
          const submitPromise: Promise<SWTransactionResponse> | undefined = stepType === CommonStepType.TOKEN_APPROVAL ? handleBridgeSpendingApproval(values) : handleBasicSubmit(values, options);

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
      // Handle transfer action
      submitData(processState.currentStep)
        .catch(onError)
        .finally(() => {
          setLoading(false);
        });
    }, 300);
  }, [handleBasicSubmit, handleBridgeSpendingApproval, isShowWarningOnSubmit, onError, onSuccess, processState]);

  const onSetMaxTransferable = useCallback((value: boolean) => {
    const bnMaxTransfer = new BN(maxTransfer);

    if (!bnMaxTransfer.isZero()) {
      setIsTransferAll(value);
    }
  }, [maxTransfer]);

  const onSubmit: FormCallbacks<TransferParams>['onFinish'] = useCallback((values: TransferParams) => {
    const options: TransferOptions = {
      isTransferAll: isTransferAll,
      isTransferBounceable: false
    };

    let checkTransferAll = false;

    const _doSubmit = async () => {
      if (values.chain !== values.destChain) {
        const originChainInfo = chainInfoMap[values.chain];
        const destChainInfo = chainInfoMap[values.destChain];
        const assetSlug = values.asset;
        const isMythosFromHydrationToMythos = _isMythosFromHydrationToMythos(originChainInfo, destChainInfo, assetSlug);

        if (_isXcmTransferUnstable(originChainInfo, destChainInfo, assetSlug)) {
          openAlert({
            type: NotificationType.WARNING,
            content: t(_getXcmUnstableWarning(originChainInfo, destChainInfo, assetSlug)),
            title: isMythosFromHydrationToMythos ? t('High fee alert!') : t('Pay attention!'),
            okButton: {
              text: t('Continue'),
              onClick: () => {
                closeAlert();
                setLoading(true);
                doSubmit(values, options);
              }
            },
            cancelButton: {
              text: t('Cancel'),
              onClick: () => {
                closeAlert();
                setLoading(false);
              }
            }
          });

          return;
        }
      }

      if (TON_CHAINS.includes(values.chain)) {
        const isShowTonBouncealbeModal = await isTonBounceableAddress({ address: values.to, chain: values.chain });
        const chainInfo = chainInfoMap[values.destChain];

        if (isShowTonBouncealbeModal && !options.isTransferBounceable) {
          const bounceableAddressPrefix = values.to.substring(0, 2);
          const formattedAddress = _reformatAddressWithChain(values.to, chainInfo);
          const formattedAddressPrefix = formattedAddress.substring(0, 2);

          openAlert({
            type: NotificationType.WARNING,
            content: t(`Transferring to an ${bounceableAddressPrefix} address is not supported. Continuing will result in a transfer to the corresponding ${formattedAddressPrefix} address (same seed phrase)`),
            title: t('Unsupported address'),
            okButton: {
              text: t('Continue'),
              onClick: () => {
                form.setFieldValue('to', formattedAddress);
                updateAddressInputValue(formattedAddress);
                closeAlert();
                setLoading(true);
                options.isTransferBounceable = true;
                _doSubmit().catch((error) => {
                  console.error('Error during submit:', error);
                });
              }
            },
            cancelButton: {
              text: t('Cancel'),
              onClick: () => {
                closeAlert();
                setLoading(false);
              }
            }
          });

          return;
        }
      }

      if (_isNativeToken(assetInfo)) {
        const minAmount = _getTokenMinAmount(assetInfo);
        const bnMinAmount = new BN(minAmount);

        if (bnMinAmount.gt(BN_ZERO) && isTransferAll && values.chain === values.destChain && !checkTransferAll) {
          openAlert({
            type: NotificationType.WARNING,
            content: t('Transferring all will remove all assets on this network. Are you sure?'),
            title: t('Pay attention!'),
            okButton: {
              text: t('Transfer'),
              onClick: () => {
                closeAlert();
                setLoading(true);
                checkTransferAll = true;
                _doSubmit().catch((error) => {
                  console.error('Error during submit:', error);
                });
              }
            },
            cancelButton: {
              text: t('Cancel'),
              onClick: () => {
                closeAlert();
                setLoading(false);
              }
            }
          });

          return;
        }
      }

      const latestValue = form.getFieldsValue();

      doSubmit(latestValue, options);
    };

    _doSubmit().catch((error) => {
      console.error('Error during submit:', error);
    });
  }, [assetInfo, chainInfoMap, closeAlert, doSubmit, form, isTransferAll, openAlert, t, updateAddressInputValue]);

  const onClickSubmit = useCallback((values: TransferParams) => {
    if (currentConfirmation) {
      mktCampaignModalContext.openModal({
        type: 'confirmation',
        title: currentConfirmation.name,
        message: currentConfirmation.content,
        externalButtons: renderConfirmationButtons(mktCampaignModalContext.hideModal, () => {
          onSubmit(values);
          mktCampaignModalContext.hideModal();
        })
      });
    } else {
      onSubmit(values);
    }
  }, [currentConfirmation, mktCampaignModalContext, onSubmit, renderConfirmationButtons]);

  // todo: recheck with ledger account
  useEffect(() => {
    const updateInfoWithTokenSlug = (tokenSlug: string) => {
      const existedToken = tokenItems.find(({ slug }) => slug === tokenSlug);
      const isAllowedToken = !!existedToken && chainStateMap[existedToken.originChain].active;

      if (isAllowedToken) {
        const tokenInfo = assetRegistry[tokenSlug];

        form.setFieldsValue({
          asset: tokenSlug,
          chain: tokenInfo.originChain,
          destChain: tokenInfo.originChain
        });
      }
    };

    if (tokenItems.length && !assetValue) {
      if (targetAccountProxy && !isAccountAll(targetAccountProxy.id)) {
        if (targetAccountProxy.accountType === AccountProxyType.UNIFIED) {
          updateInfoWithTokenSlug(substrateAccountSlug);
        } else {
          if (targetAccountProxy.chainTypes.includes(AccountChainType.SUBSTRATE)) {
            updateInfoWithTokenSlug(substrateAccountSlug);
          } else if (targetAccountProxy.chainTypes.includes(AccountChainType.ETHEREUM)) {
            updateInfoWithTokenSlug(evmAccountSlug);
          } else if (targetAccountProxy.chainTypes.includes(AccountChainType.TON)) {
            updateInfoWithTokenSlug(tonAccountSlug);
          }
        }
      }
    }
  }, [assetRegistry, assetValue, chainInfoMap, chainStateMap, form, targetAccountProxy, tokenItems]);

  useEffect(() => {
    const updateFromValue = () => {
      if (!accountAddressItems.length) {
        return;
      }

      if (accountAddressItems.length === 1) {
        if (!fromValue || accountAddressItems[0].address !== fromValue) {
          form.setFieldValue('from', accountAddressItems[0].address);
        }
      } else {
        if (fromValue && !accountAddressItems.some((i) => i.address === fromValue)) {
          form.setFieldValue('from', '');
        }
      }
    };

    updateFromValue();
  }, [accountAddressItems, disabledToAddressInput, form, fromValue]);

  // Get max transfer value
  useEffect(() => {
    let cancel = false;

    setIsFetchingMaxValue(false);

    if (fromValue && assetValue) {
      getMaxTransfer({
        address: fromValue,
        networkKey: assetRegistry[assetValue].originChain,
        token: assetValue,
        isXcmTransfer: chainValue !== destChainValue,
        destChain: destChainValue
      })
        .then((balance) => {
          if (!cancel) {
            setMaxTransfer(balance.value);
            setIsFetchingMaxValue(true);
          }
        })
        .catch(() => {
          if (!cancel) {
            setMaxTransfer('0');
            setIsFetchingMaxValue(true);
          }
        })
        .finally(() => {
          if (!cancel) {
            const value = form.getFieldValue('value') as string;

            if (value) {
              update({});
            }
          }
        });
    }

    return () => {
      cancel = true;
    };
  }, [assetValue, assetRegistry, chainValue, chainStatus, form, fromValue, destChainValue]);

  useEffect(() => {
    const bnTransferAmount = new BN(transferAmountValue || '0');
    const bnMaxTransfer = new BN(maxTransfer || '0');

    if (bnTransferAmount.gt(BN_ZERO) && bnTransferAmount.eq(bnMaxTransfer)) {
      setIsTransferAll(true);
    }
  }, [maxTransfer, transferAmountValue]);

  useEffect(() => {
    getOptimalTransferProcess({
      amount: transferAmountValue,
      address: fromValue,
      originChain: chainValue,
      tokenSlug: assetValue,
      destChain: destChainValue
    })
      .then((result) => {
        dispatchProcessState({
          payload: {
            steps: result.steps,
            feeStructure: result.totalFee
          },
          type: CommonActionType.STEP_CREATE
        });
      })
      .catch((e) => {
        console.log('error', e);
      });
  }, [assetValue, chainValue, destChainValue, fromValue, transferAmountValue]);

  useEffect(() => {
    if (disabledToAddressInput) {
      const selectedItem = accountAddressItems.find((i) => i.address === fromValue);
      const chainInfo = chainInfoMap[chainValue];
      const reformatedInputValue = _reformatAddressWithChain(fromValue, chainInfo);

      addressInputCurrent?.setInputValue?.(selectedItem?.address);
      addressInputCurrent?.setSelectedOption?.({
        address: selectedItem?.address || '',
        formatedAddress: reformatedInputValue,
        analyzedGroup: AnalyzedGroup.RECENT,
        displayName: selectedItem?.accountName
      });
      form.setFieldValue('to', fromValue);
    }
  }, [accountAddressItems, addressInputCurrent, chainInfoMap, chainValue, disabledToAddressInput, form, fromValue]);

  useRestoreTransaction(form);

  return (
    <>
      <TransactionContent className={CN(`${className} -transaction-content`)}>
        <div className={'__brief common-text text-light-4 text-center'}>
          {t('You are performing a transfer of a fungible token')}
        </div>

        <Form
          className={'form-container form-space-sm'}
          form={form}
          initialValues={formDefault}
          onFinish={onClickSubmit}
          onValuesChange={onValuesChange}
        >
          <HiddenInput fields={hiddenFields} />

          <div className={'form-row'}>
            <Form.Item name={'asset'}>
              <TokenSelector
                disabled={!tokenItems.length}
                items={tokenItems}
                placeholder={t('Select token')}
                showChainInSelected
                tooltip={t('Select token')}
              />
            </Form.Item>

            <Icon
              className={'middle-item'}
              phosphorIcon={PaperPlaneRight}
              size={'md'}
            />

            <Form.Item name={'destChain'}>
              <ChainSelector
                disabled={!destChainItems.length}
                items={destChainItems}
                title={t('Select destination chain')}
                tooltip={t('Select destination chain')}
              />
            </Form.Item>
          </div>

          <Form.Item
            className={CN({ hidden: isNotShowAccountSelector })}
            name={'from'}
            statusHelpAsTooltip={true}
          >
            <AccountAddressSelector
              items={accountAddressItems}
              label={`${t('From')}:`}
              labelStyle={'horizontal'}
            />
          </Form.Item>

          <Form.Item
            name={'to'}
            rules={[
              {
                validator: validateRecipient
              }
            ]}
            statusHelpAsTooltip={true}
            validateTrigger={false}
          >
            <AddressInputNew
              chainSlug={destChainValue}
              disabled={disabledToAddressInput}
              dropdownHeight={isNotShowAccountSelector ? 317 : 257}
              key={addressInputRenderKey}
              label={`${t('To')}:`}
              labelStyle={'horizontal'}
              placeholder={t('Enter address')}
              ref={addressInputRef}
              saveAddress={true}
              showAddressBook={true}
              showScanner={true}
            />
          </Form.Item>

          <FreeBalance
            address={fromValue}
            chain={chainValue}
            className={'free-balance-block'}
            extrinsicType={extrinsicType}
            onBalanceReady={setIsBalanceReady}
            tokenSlug={assetValue}
          />

          <Form.Item
            name={'value'}
            rules={[
              {
                validator: validateAmount
              }
            ]}
            statusHelpAsTooltip={true}
            validateTrigger={false}
          >
            <AmountInput
              decimals={decimals}
              disabled={decimals === 0}
              forceUpdateMaxValue={forceUpdateMaxValue}
              maxValue={maxTransfer}
              onSetMax={onSetMaxTransferable}
              showMaxButton={!hideMaxButton}
              tooltip={t('Amount')}
            />
          </Form.Item>
        </Form>

        {
          chainValue !== destChainValue && (
            <div className={'__warning_message_cross_chain'}>
              <AlertBox
                description={t('Cross-chain transfer to an exchange (CEX) will result in loss of funds. Make sure the receiving address is not an exchange address.')}
                title={t('Pay attention!')}
                type={'warning'}
              />
            </div>
          )
        }
        {
          !!alertProps && (
            <AlertModal
              modalId={alertModalId}
              {...alertProps}
            />
          )
        }
      </TransactionContent>
      <TransactionFooter
        className={`${className} -transaction-footer`}
      >
        <Button
          disabled={!isBalanceReady || (isTransferAll ? !isFetchingMaxValue : false)}
          icon={(
            <Icon
              phosphorIcon={PaperPlaneTilt}
              weight={'fill'}
            />
          )}
          loading={loading}
          onClick={checkAction(form.submit, extrinsicType)}
          schema={isTransferAll ? 'warning' : undefined}
        >
          {isTransferAll ? t('Transfer all') : t('Transfer')}
        </Button>
      </TransactionFooter>
    </>
  );
};

const Wrapper: React.FC<WrapperProps> = (props: WrapperProps) => {
  const { className } = props;
  const { defaultData } = useTransactionContext<TransferParams>();
  const { goHome } = useDefaultNavigate();
  const { accountProxies, isAllAccount } = useSelector((state) => state.accountState);

  const targetAccountProxy = useMemo(() => {
    return accountProxies.find((ap) => {
      if (!defaultData.fromAccountProxy) {
        return isAccountAll(ap.id);
      }

      return ap.id === defaultData.fromAccountProxy;
    });
  }, [accountProxies, defaultData.fromAccountProxy]);

  useEffect(() => {
    if (!targetAccountProxy) {
      goHome();
    }
  }, [goHome, targetAccountProxy]);

  if (!targetAccountProxy) {
    return (
      <></>
    );
  }

  return (
    <Component
      className={className}
      isAllAccount={isAllAccount}
      targetAccountProxy={targetAccountProxy}
    />
  );
};

const SendFund = styled(Wrapper)(({ theme }) => {
  const token = (theme as Theme).token;

  return ({
    '.__brief': {
      paddingLeft: token.padding,
      paddingRight: token.padding,
      marginBottom: token.marginMD
    },

    '.form-row': {
      gap: 8
    },

    '.middle-item': {
      marginBottom: token.marginSM
    },

    '.__warning_message_cross_chain': {
      marginTop: token.marginXS
    },

    '.free-balance-block': {
      marginBottom: token.marginSM,
      justifyContent: 'end'
    },

    '&.-transaction-content.-is-zero-balance': {
      '.free-balance .ant-number': {
        '.ant-number-integer, .ant-number-decimal': {
          color: `${token.colorError} !important`
        }
      }
    }
  });
});

export default SendFund;
