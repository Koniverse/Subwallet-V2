// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { _ChainAsset } from '@subwallet/chain-list/types';
import { SwapError } from '@subwallet/extension-base/background/errors/SwapError';
import { TransactionError } from '@subwallet/extension-base/background/errors/TransactionError';
import { ChainType, ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import { _getSimpleSwapEarlyValidationError } from '@subwallet/extension-base/core/logic-validation/swap';
import { _getAssetDecimals, _getChainNativeTokenSlug, _getContractAddressOfToken, _isChainSubstrateCompatible, _isNativeToken, _isSmartContractToken } from '@subwallet/extension-base/services/chain-service/utils';
import { BaseStepDetail, BasicTxErrorType, CommonFeeComponent, CommonOptimalPath, CommonStepFeeInfo, CommonStepType, OptimalSwapPathParams, SimpleSwapTxData, SimpleSwapValidationMetadata, SwapEarlyValidation, SwapErrorType, SwapFeeType, SwapProviderId, SwapQuote, SwapRequest, SwapStepType, SwapSubmitParams, SwapSubmitStepData, TransactionData, ValidateSwapProcessParams } from '@subwallet/extension-base/types';
import { _reformatAddressWithChain, formatNumber } from '@subwallet/extension-base/utils';
import BigN, { BigNumber } from 'bignumber.js';

import { SubmittableExtrinsic } from '@polkadot/api/types';

import { BalanceService } from '../../balance-service';
import { getERC20TransactionObject, getEVMTransactionObject } from '../../balance-service/transfer/smart-contract';
import { createTransferExtrinsic, getTransferMockTxFee } from '../../balance-service/transfer/token';
import { ChainService } from '../../chain-service';
import { EvmApi } from '../../chain-service/handler/EvmApi';
import { _SubstrateApi } from '../../chain-service/types';
import { calculateSwapRate, SIMPLE_SWAP_SUPPORTED_TESTNET_ASSET_MAPPING, SWAP_QUOTE_TIMEOUT_MAP } from '../utils';
import { SwapBaseHandler, SwapBaseInterface } from './base-handler';

interface SwapRange {
  min: string;
  max: string;
}

interface ExchangeSimpleSwapData{
  id: string;
  trace_id: string;
  address_from: string;
  amount_to: string;
}

const apiUrl = 'https://api.simpleswap.io';

export const simpleSwapApiKey = process.env.SIMPLE_SWAP_API_KEY || '';

const toBNString = (input: string | number | BigNumber, decimal: number): string => {
  const raw = new BigNumber(input);

  return raw.shiftedBy(decimal).integerValue(BigNumber.ROUND_CEIL).toFixed();
};

const fetchSwapList = async (params: { fromSymbol: string }): Promise<string[]> => {
  const swapListParams = new URLSearchParams({
    api_key: `${simpleSwapApiKey}`,
    fixed: 'false',
    symbol: params.fromSymbol
  });

  const response = await fetch(`${apiUrl}/get_pairs?${swapListParams.toString()}`, {
    headers: { accept: 'application/json' }
  });

  return await response.json() as string[];
};

const fetchRanges = async (params: { fromSymbol: string; toSymbol: string }): Promise<SwapRange> => {
  const rangesParams = new URLSearchParams({
    api_key: `${simpleSwapApiKey}`,
    fixed: 'false',
    currency_from: params.fromSymbol,
    currency_to: params.toSymbol
  });

  const response = await fetch(`${apiUrl}/get_ranges?${rangesParams.toString()}`, {
    headers: { accept: 'application/json' }
  });

  return await response.json() as SwapRange;
};

async function getEstimate (request: SwapRequest, fromAsset: _ChainAsset, toAsset: _ChainAsset): Promise<{ toAmount: string; walletFeeAmount: string }> {
  const fromSymbol = SIMPLE_SWAP_SUPPORTED_TESTNET_ASSET_MAPPING[fromAsset.slug];
  const toSymbol = SIMPLE_SWAP_SUPPORTED_TESTNET_ASSET_MAPPING[toAsset.slug];
  const assetDecimals = _getAssetDecimals(fromAsset);

  if (!fromSymbol || !toSymbol) {
    throw new SwapError(SwapErrorType.ASSET_NOT_SUPPORTED);
  }

  const formatedAmount = formatNumber(request.fromAmount, assetDecimals, (s) => s);

  const params = new URLSearchParams({
    api_key: `${simpleSwapApiKey}`,
    fixed: 'false',
    currency_from: fromSymbol,
    currency_to: toSymbol,
    amount: formatedAmount
  });

  try {
    const response = await fetch(`${apiUrl}/get_estimated?${params.toString()}`, {
      headers: { accept: 'application/json' }
    });

    if (!response.ok) {
      throw new SwapError(SwapErrorType.ERROR_FETCHING_QUOTE);
    }

    const resToAmount = await response.json() as string;
    const toAmount = toBNString(resToAmount, _getAssetDecimals(toAsset));
    const bnToAmount = new BigN(toAmount);

    const walletFeeRate = 4 / 1000;
    const toAmountBeforeFee = bnToAmount.dividedBy(new BigN(1 - walletFeeRate));
    const walletFeeAmount = toAmountBeforeFee.multipliedBy(4).dividedBy(1000).toString();

    return {
      toAmount,
      walletFeeAmount
    };
  } catch (err) {
    console.error('Error:', err);
    throw new SwapError(SwapErrorType.ERROR_FETCHING_QUOTE);
  }
}

const createSwapRequest = async (params: {fromSymbol: string; toSymbol: string; fromAmount: string; fromAsset: _ChainAsset; receiver: string; sender: string; toAsset: _ChainAsset;}) => {
  const fromDecimals = _getAssetDecimals(params.fromAsset);
  const toDecimals = _getAssetDecimals(params.toAsset);
  const formatedAmount = formatNumber(params.fromAmount, fromDecimals, (s) => s);
  const requestBody = {
    fixed: false,
    currency_from: params.fromSymbol,
    currency_to: params.toSymbol,
    amount: formatedAmount, // Convert to small number due to require of api
    address_to: params.receiver,
    extra_id_to: '',
    user_refund_address: params.sender,
    user_refund_extra_id: ''
  };

  const response = await fetch(
    `${apiUrl}/create_exchange?api_key=${simpleSwapApiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(requestBody)
    }
  );

  const depositAddressResponse = await response.json() as ExchangeSimpleSwapData;

  return {
    id: depositAddressResponse.id,
    addressFrom: depositAddressResponse.address_from,
    amountTo: toBNString(depositAddressResponse.amount_to, toDecimals)
  };
};

export class SimpleSwapHandler implements SwapBaseInterface {
  private swapBaseHandler: SwapBaseHandler;
  providerSlug: SwapProviderId;

  constructor (chainService: ChainService, balanceService: BalanceService) {
    this.swapBaseHandler = new SwapBaseHandler({
      chainService,
      balanceService,
      providerName: 'SimpleSwap',
      providerSlug: SwapProviderId.SIMPLE_SWAP
    });
    this.providerSlug = SwapProviderId.SIMPLE_SWAP;
  }

  public async validateSwapProcess (params: ValidateSwapProcessParams): Promise<TransactionError[]> {
    const amount = params.selectedQuote.fromAmount;
    const bnAmount = BigInt(amount);

    if (bnAmount <= BigInt(0)) {
      return Promise.resolve([new TransactionError(BasicTxErrorType.INVALID_PARAMS, 'Amount must be greater than 0')]);
    }

    let isXcmOk = false;

    for (const [index, step] of params.process.steps.entries()) {
      const getErrors = async (): Promise<TransactionError[]> => {
        switch (step.type) {
          case CommonStepType.DEFAULT:
            return Promise.resolve([]);
          case CommonStepType.TOKEN_APPROVAL:
            return Promise.reject(new TransactionError(BasicTxErrorType.UNSUPPORTED));
          default:
            return this.swapBaseHandler.validateSwapStep(params, isXcmOk, index);
        }
      };

      const errors = await getErrors();

      if (errors.length) {
        return errors;
      } else if (step.type === CommonStepType.XCM) {
        isXcmOk = true;
      }
    }

    return [];
  }

  get chainService () {
    return this.swapBaseHandler.chainService;
  }

  get balanceService () {
    return this.swapBaseHandler.balanceService;
  }

  get providerInfo () {
    return this.swapBaseHandler.providerInfo;
  }

  get name () {
    return this.swapBaseHandler.name;
  }

  get slug () {
    return this.swapBaseHandler.slug;
  }

  public async getSwapQuote (request: SwapRequest): Promise<SwapQuote | SwapError> {
    try {
      const fromAsset = this.chainService.getAssetBySlug(request.pair.from);
      const toAsset = this.chainService.getAssetBySlug(request.pair.to);

      if (!fromAsset || !toAsset) {
        return new SwapError(SwapErrorType.UNKNOWN);
      }

      const earlyValidation = await this.validateSwapRequest(request);

      const metadata = earlyValidation.metadata as SimpleSwapValidationMetadata;

      if (earlyValidation.error) {
        return _getSimpleSwapEarlyValidationError(earlyValidation.error, metadata);
      }

      const { toAmount, walletFeeAmount } = await getEstimate(request, fromAsset, toAsset);
      const fromAmount = request.fromAmount;

      const rate = calculateSwapRate(request.fromAmount, toAmount, fromAsset, toAsset);

      const fromChain = this.chainService.getChainInfoByKey(fromAsset.originChain);
      const fromChainNativeTokenSlug = _getChainNativeTokenSlug(fromChain);
      const defaultFeeToken = _isNativeToken(fromAsset) ? fromAsset.slug : fromChainNativeTokenSlug;

      const chainType = _isChainSubstrateCompatible(fromChain) ? ChainType.SUBSTRATE : ChainType.EVM;

      let api: _SubstrateApi | EvmApi;

      if (chainType === ChainType.SUBSTRATE) {
        api = this.chainService.getSubstrateApi(fromChain.slug);
      } else {
        api = this.chainService.getEvmApi(fromChain.slug);
      }

      const networkFeeAmount = await getTransferMockTxFee(request.address, fromChain, fromAsset, api);

      const networkFee: CommonFeeComponent = {
        tokenSlug: fromChainNativeTokenSlug,
        amount: networkFeeAmount.toString(),
        feeType: SwapFeeType.NETWORK_FEE
      };

      const walletFee: CommonFeeComponent = {
        tokenSlug: toAsset.slug,
        amount: walletFeeAmount,
        feeType: SwapFeeType.WALLET_FEE
      };

      return {
        pair: request.pair,
        fromAmount,
        toAmount,
        rate,
        provider: this.providerInfo,
        aliveUntil: +Date.now() + (SWAP_QUOTE_TIMEOUT_MAP[this.slug] || SWAP_QUOTE_TIMEOUT_MAP.default),
        minSwap: toBNString(metadata.minSwap.value, _getAssetDecimals(fromAsset)),
        maxSwap: toBNString(metadata.maxSwap?.value, _getAssetDecimals(fromAsset)),
        estimatedArrivalTime: 3600,
        isLowLiquidity: false,
        feeInfo: {
          feeComponent: [networkFee, walletFee],
          defaultFeeToken,
          feeOptions: [defaultFeeToken]
        },
        route: {
          path: [fromAsset.slug, toAsset.slug]
        }
      } as SwapQuote;
    } catch (e) {
      return new SwapError(SwapErrorType.UNKNOWN);
    }
  }

  generateOptimalProcess (params: OptimalSwapPathParams): Promise<CommonOptimalPath> {
    return this.swapBaseHandler.generateOptimalProcess(params, [
      this.getSubmitStep
    ]);
  }

  async getSubmitStep (params: OptimalSwapPathParams): Promise<[BaseStepDetail, CommonStepFeeInfo] | undefined> {
    if (params.selectedQuote) {
      const submitStep = {
        name: 'Swap',
        type: SwapStepType.SWAP
      };

      return Promise.resolve([submitStep, params.selectedQuote.feeInfo]);
    }

    return Promise.resolve(undefined);
  }

  public async validateSwapRequest (request: SwapRequest): Promise<SwapEarlyValidation> {
    try {
      const fromAsset = this.chainService.getAssetBySlug(request.pair.from);
      const toAsset = this.chainService.getAssetBySlug(request.pair.to);

      if (!fromAsset || !toAsset) {
        return { error: SwapErrorType.ERROR_FETCHING_QUOTE };
      }

      const fromSymbol = SIMPLE_SWAP_SUPPORTED_TESTNET_ASSET_MAPPING[fromAsset.slug];
      const toSymbol = SIMPLE_SWAP_SUPPORTED_TESTNET_ASSET_MAPPING[toAsset.slug];

      if (!fromSymbol || !toSymbol) {
        return { error: SwapErrorType.ASSET_NOT_SUPPORTED };
      }

      try {
        const swapList = await fetchSwapList({ fromSymbol });

        if (!swapList.includes(toSymbol)) {
          return { error: SwapErrorType.ASSET_NOT_SUPPORTED };
        }
      } catch (err) {
        console.error('Error:', err);
      }

      const ranges = await fetchRanges({ fromSymbol, toSymbol }) as unknown as SwapRange;
      const { max, min } = ranges;
      const bnMin = toBNString(min, _getAssetDecimals(fromAsset));
      const bnAmount = BigInt(request.fromAmount);

      if (bnAmount < BigInt(bnMin)) {
        return {
          error: SwapErrorType.NOT_MEET_MIN_SWAP,
          metadata: {
            minSwap: {
              value: min,
              symbol: fromAsset.symbol
            },
            maxSwap: max
              ? {
                value: max,
                symbol: fromAsset.symbol
              }
              : undefined,
            chain: this.chainService.getChainInfoByKey(fromAsset.originChain)
          } as SimpleSwapValidationMetadata
        };
      }

      if (max && bnAmount > BigInt(toBNString(max, _getAssetDecimals(fromAsset)))) {
        return {
          error: SwapErrorType.SWAP_EXCEED_ALLOWANCE,
          metadata: {
            minSwap: {
              value: min,
              symbol: fromAsset.symbol
            },
            maxSwap: {
              value: max,
              symbol: fromAsset.symbol
            },
            chain: this.chainService.getChainInfoByKey(fromAsset.originChain)
          } as SimpleSwapValidationMetadata
        };
      }

      return {
        metadata: {
          minSwap: {
            value: min,
            symbol: fromAsset.symbol
          },
          maxSwap: max
            ? {
              value: max,
              symbol: fromAsset.symbol
            }
            : undefined,
          chain: this.chainService.getChainInfoByKey(fromAsset.originChain)
        } as SimpleSwapValidationMetadata
      };
    } catch (e) {
      console.error(e);

      return { error: SwapErrorType.UNKNOWN };
    }
  }

  public async handleSwapProcess (params: SwapSubmitParams): Promise<SwapSubmitStepData> {
    const { currentStep, process } = params;
    const type = process.steps[currentStep].type;

    switch (type) {
      case CommonStepType.DEFAULT:
        return Promise.reject(new TransactionError(BasicTxErrorType.UNSUPPORTED));
      case SwapStepType.SWAP:
        return this.handleSubmitStep(params);
      default:
        return this.handleSubmitStep(params);
    }
  }

  public async handleSubmitStep (params: SwapSubmitParams): Promise<SwapSubmitStepData> {
    const { address, quote, recipient } = params;

    const pair = quote.pair;

    const fromAsset = this.chainService.getAssetBySlug(pair.from);
    const toAsset = this.chainService.getAssetBySlug(pair.to);
    const chainInfo = this.chainService.getChainInfoByKey(fromAsset.originChain);
    const toChainInfo = this.chainService.getChainInfoByKey(toAsset.originChain);
    const chainType = _isChainSubstrateCompatible(chainInfo) ? ChainType.SUBSTRATE : ChainType.EVM;
    const sender = _reformatAddressWithChain(address, chainInfo);
    const receiver = _reformatAddressWithChain(recipient ?? sender, toChainInfo);

    const fromSymbol = SIMPLE_SWAP_SUPPORTED_TESTNET_ASSET_MAPPING[fromAsset.slug];
    const toSymbol = SIMPLE_SWAP_SUPPORTED_TESTNET_ASSET_MAPPING[toAsset.slug];

    const { fromAmount } = quote;
    const { addressFrom, amountTo, id } = await createSwapRequest({ fromSymbol, toSymbol, fromAmount, fromAsset, receiver, sender, toAsset });

    // Validate the amount to be swapped
    const rate = BigN(amountTo).div(BigN(quote.toAmount)).multipliedBy(100);

    if (rate.lt(95)) {
      throw new SwapError(SwapErrorType.NOT_MEET_MIN_EXPECTED);
    }

    // Can modify quote.toAmount to amountTo after confirm real amount received

    const txData: SimpleSwapTxData = {
      id: id,
      address,
      provider: this.providerInfo,
      quote: params.quote,
      slippage: params.slippage,
      recipient: receiver,
      process: params.process
    };

    let extrinsic: TransactionData;

    if (chainType === ChainType.SUBSTRATE) {
      const chainApi = this.chainService.getSubstrateApi(chainInfo.slug);
      const substrateApi = await chainApi.isReady;

      const [submittableExtrinsic] = await createTransferExtrinsic({
        from: address,
        networkKey: chainInfo.slug,
        substrateApi,
        to: addressFrom,
        tokenInfo: fromAsset,
        transferAll: false,
        value: quote.fromAmount
      });

      extrinsic = submittableExtrinsic as SubmittableExtrinsic<'promise'>;
    } else {
      if (_isNativeToken(fromAsset)) {
        const [transactionConfig] = await getEVMTransactionObject(
          chainInfo,
          address,
          addressFrom,
          quote.fromAmount,
          false,
          this.chainService.getEvmApi(chainInfo.slug)
        );

        extrinsic = transactionConfig;
      } else {
        const [transactionConfig] = await getERC20TransactionObject(
          _getContractAddressOfToken(fromAsset),
          chainInfo,
          address,
          addressFrom,
          quote.fromAmount,
          false,
          this.chainService.getEvmApi(chainInfo.slug)
        );

        extrinsic = transactionConfig;
      }
    }

    return {
      txChain: fromAsset.originChain,
      txData,
      extrinsic,
      transferNativeAmount: _isNativeToken(fromAsset) ? quote.fromAmount : '0',
      extrinsicType: ExtrinsicType.SWAP,
      chainType
    } as SwapSubmitStepData;
  }
}
