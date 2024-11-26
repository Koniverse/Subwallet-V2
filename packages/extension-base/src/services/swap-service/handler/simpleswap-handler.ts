// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { _ChainAsset } from '@subwallet/chain-list/types';
import { SwapError } from '@subwallet/extension-base/background/errors/SwapError';
import { TransactionError } from '@subwallet/extension-base/background/errors/TransactionError';
import { ChainType, ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import { _getSimpleSwapEarlyValidationError } from '@subwallet/extension-base/core/logic-validation/swap';
import { _getAssetSymbol, _getChainNativeTokenSlug, _getContractAddressOfToken, _isChainSubstrateCompatible, _isNativeToken, _isSmartContractToken } from '@subwallet/extension-base/services/chain-service/utils';
import { BaseStepDetail, BasicTxErrorType, CommonFeeComponent, CommonOptimalPath, CommonStepFeeInfo, CommonStepType, OptimalSwapPathParams, SimpleSwapTxData, SimpleSwapValidationMetadata, SwapEarlyValidation, SwapErrorType, SwapFeeType, SwapProviderId, SwapQuote, SwapRequest, SwapStepType, SwapSubmitParams, SwapSubmitStepData, TransactionData, ValidateSwapProcessParams } from '@subwallet/extension-base/types';
import { formatNumber, toBNString } from '@subwallet/extension-base/utils';
import BigNumber from 'bignumber.js';

import { SubmittableExtrinsic } from '@polkadot/api/types';

import { BalanceService } from '../../balance-service';
import { getERC20TransactionObject, getEVMTransactionObject } from '../../balance-service/transfer/smart-contract';
import { createTransferExtrinsic } from '../../balance-service/transfer/token';
import { ChainService } from '../../chain-service';
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
}

const apiUrl = 'https://api.simpleswap.io';

export const simpleSwapApiKey = process.env.SIMPLE_SWAP_API_KEY || '';

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

  public validateSwapProcess (params: ValidateSwapProcessParams): Promise<TransactionError[]> {
    const amount = params.selectedQuote.fromAmount;
    const bnAmount = new BigNumber(amount);

    if (bnAmount.lte(0)) {
      return Promise.resolve([new TransactionError(BasicTxErrorType.INVALID_PARAMS, 'Amount must be greater than 0')]);
    }

    return Promise.resolve([]);
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
      const fromSymbol = SIMPLE_SWAP_SUPPORTED_TESTNET_ASSET_MAPPING[fromAsset.slug];
      const toSymbol = SIMPLE_SWAP_SUPPORTED_TESTNET_ASSET_MAPPING[toAsset.slug];

      if (!fromAsset || !toAsset) {
        return new SwapError(SwapErrorType.UNKNOWN);
      }

      const earlyValidation = await this.validateSwapRequest(request);

      const metadata = earlyValidation.metadata as SimpleSwapValidationMetadata;

      if (earlyValidation.error) {
        return _getSimpleSwapEarlyValidationError(earlyValidation.error, metadata);
      }

      const params = new URLSearchParams({
        api_key: `${simpleSwapApiKey}`,
        fixed: 'false',
        currency_from: fromSymbol,
        currency_to: toSymbol,
        amount: formatNumber(request.fromAmount, fromAsset.decimals || 0)
      });

      const response = await fetch(`${apiUrl}/get_estimated?${params.toString()}`, {
        headers: { accept: 'application/json' }
      });

      if (!response.ok) {
        return new SwapError(SwapErrorType.ERROR_FETCHING_QUOTE);
      }

      const resToAmount = await response.json() as string;
      const toAmount = toBNString(resToAmount, toAsset.decimals || 0);

      const rate = calculateSwapRate(request.fromAmount, toAmount, fromAsset, toAsset);

      const fromChain = this.chainService.getChainInfoByKey(fromAsset.originChain);
      const fromChainNativeTokenSlug = _getChainNativeTokenSlug(fromChain);
      const defaultFeeToken = _isNativeToken(fromAsset) ? fromAsset.slug : fromChainNativeTokenSlug;

      const feeComponent: CommonFeeComponent[] = [
        {
          tokenSlug: fromAsset.slug,
          amount: '0',
          feeType: SwapFeeType.NETWORK_FEE
        }
      ];

      return {
        pair: request.pair,
        fromAmount: request.fromAmount,
        toAmount,
        rate,
        provider: this.providerInfo,
        aliveUntil: +Date.now() + (SWAP_QUOTE_TIMEOUT_MAP[this.slug] || SWAP_QUOTE_TIMEOUT_MAP.default),
        minSwap: toBNString(metadata.minSwap.value, fromAsset.decimals || 0),
        maxSwap: metadata.maxSwap?.value,
        estimatedArrivalTime: 0,
        isLowLiquidity: false,
        feeInfo: {
          feeComponent,
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
        return { error: SwapErrorType.ASSET_NOT_SUPPORTED };
      }

      const fromSymbol = SIMPLE_SWAP_SUPPORTED_TESTNET_ASSET_MAPPING[fromAsset.slug];
      const toSymbol = SIMPLE_SWAP_SUPPORTED_TESTNET_ASSET_MAPPING[toAsset.slug];

      if (!fromSymbol || !toSymbol) {
        return { error: SwapErrorType.ASSET_NOT_SUPPORTED };
      }

      console.log('Hmm', simpleSwapApiKey);
      const swapListParams = new URLSearchParams({
        api_key: `${simpleSwapApiKey}`,
        fixed: 'false',
        symbol: fromSymbol
      });

      const swapListResponse = await fetch(`${apiUrl}/get_pairs?${swapListParams.toString()}`, {
        headers: { accept: 'application/json' }
      });

      if (!swapListResponse.ok) {
        return { error: SwapErrorType.UNKNOWN };
      }

      const swapList = await swapListResponse.json() as string[];

      console.log('Hmm', swapList);

      if (!swapList.includes(toAsset.symbol.toLowerCase())) {
        return { error: SwapErrorType.ASSET_NOT_SUPPORTED };
      }

      const rangesParams = new URLSearchParams({
        api_key: `${simpleSwapApiKey}`,
        fixed: 'false',
        currency_from: fromSymbol,
        currency_to: toSymbol
      });

      const rangesResponse = await fetch(`${apiUrl}/get_ranges?${rangesParams.toString()}`, {
        headers: { accept: 'application/json' }
      });

      if (!rangesResponse.ok) {
        return { error: SwapErrorType.UNKNOWN };
      }

      const ranges = await rangesResponse.json() as SwapRange;
      const { max, min } = ranges;

      const bnAmount = new BigNumber(request.fromAmount);
      const parsedbnAmount = formatNumber(bnAmount.toString(), fromAsset.decimals || 0);

      if (parsedbnAmount < min) {
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

      if (max && parsedbnAmount > max) {
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
    const chainType = _isChainSubstrateCompatible(chainInfo) ? ChainType.SUBSTRATE : ChainType.EVM;
    const receiver = recipient ?? address;

    const fromSymbol = SIMPLE_SWAP_SUPPORTED_TESTNET_ASSET_MAPPING[fromAsset.slug];
    const toSymbol = SIMPLE_SWAP_SUPPORTED_TESTNET_ASSET_MAPPING[toAsset.slug];

    const requestBody = {
      fixed: false,
      currency_from: fromSymbol,
      currency_to: toSymbol,
      amount: quote.fromAmount,
      address_to: receiver,
      extra_id_to: '',
      user_refund_address: address,
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

    const txData: SimpleSwapTxData = {
      id: depositAddressResponse.id,
      address,
      provider: this.providerInfo,
      quote: params.quote,
      slippage: params.slippage,
      recipient,
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
        to: depositAddressResponse.address_from,
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
          depositAddressResponse.address_from,
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
          depositAddressResponse.address_from,
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
