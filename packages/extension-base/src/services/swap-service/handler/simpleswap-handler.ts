// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { _ChainAsset } from '@subwallet/chain-list/types';
import { SwapError } from '@subwallet/extension-base/background/errors/SwapError';
import { TransactionError } from '@subwallet/extension-base/background/errors/TransactionError';
import { _getSimpleSwapEarlyValidationError } from '@subwallet/extension-base/core/logic-validation/swap';
import { _getAssetSymbol, _getChainNativeTokenSlug, _getContractAddressOfToken, _isChainSubstrateCompatible, _isNativeToken, _isSmartContractToken } from '@subwallet/extension-base/services/chain-service/utils';
import { BaseStepDetail, CommonFeeComponent, CommonOptimalPath, CommonStepFeeInfo, OptimalSwapPathParams, SimpleSwapValidationMetadata, SwapEarlyValidation, SwapErrorType, SwapFeeType, SwapProviderId, SwapQuote, SwapRequest, SwapSubmitParams, SwapSubmitStepData, ValidateSwapProcessParams } from '@subwallet/extension-base/types';
import { formatNumber, toBNString } from '@subwallet/extension-base/utils';
import BigNumber from 'bignumber.js';

import { BalanceService } from '../../balance-service';
import { ChainService } from '../../chain-service';
import { calculateSwapRate, SWAP_QUOTE_TIMEOUT_MAP } from '../utils';
import { SwapBaseHandler, SwapBaseInterface } from './base-handler';

interface SwapRange {
  min: string;
  max: string;
}

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

  validateSwapProcess: (params: ValidateSwapProcessParams) => Promise<TransactionError[]>;

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

      // Generate API parameters
      const apiUrl = 'https://api.simpleswap.io/get_estimated';
      const params = new URLSearchParams({
        api_key: 'e7c57512-e744-42e3-9536-e311e510ac8d',
        fixed: 'false',
        currency_from: fromAsset.symbol.toLowerCase(),
        currency_to: toAsset.symbol.toLowerCase(),
        amount: formatNumber(request.fromAmount, fromAsset.decimals || 0)
      });

      const response = await fetch(`${apiUrl}?${params.toString()}`, {
        headers: { accept: 'application/json' }
      });

      if (!response.ok) {
        return new SwapError(SwapErrorType.ERROR_FETCHING_QUOTE);
      }

      const resToAmount = await response.json() as string;
      const toAmount = toBNString(resToAmount, toAsset.decimals || 0);

      console.log('Hmm', [toAmount, toAsset.decimals]);
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

  getSubmitStep!: (params: OptimalSwapPathParams) => Promise<[BaseStepDetail, CommonStepFeeInfo] | undefined>;

  public async validateSwapRequest (request: SwapRequest): Promise<SwapEarlyValidation> {
    try {
      const fromAsset = this.chainService.getAssetBySlug(request.pair.from);
      const toAsset = this.chainService.getAssetBySlug(request.pair.to);

      if (!fromAsset || !toAsset) {
        return { error: SwapErrorType.ASSET_NOT_SUPPORTED };
      }

      const apiUrl = 'https://api.simpleswap.io/get_ranges';
      const params = new URLSearchParams({
        api_key: 'e7c57512-e744-42e3-9536-e311e510ac8d',
        fixed: 'false',
        currency_from: fromAsset.symbol.toLowerCase(),
        currency_to: toAsset.symbol.toLowerCase()
      });

      const response = await fetch(`${apiUrl}?${params.toString()}`, {
        headers: { accept: 'application/json' }
      });

      if (!response.ok) {
        return { error: SwapErrorType.UNKNOWN };
      }

      const data = await response.json() as SwapRange;
      const { max, min } = data;

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

  handleSwapProcess!: (params: SwapSubmitParams) => Promise<SwapSubmitStepData>;
  handleSubmitStep!: (params: SwapSubmitParams) => Promise<SwapSubmitStepData>;
  isReady?: boolean | undefined;
  init?: (() => Promise<void>) | undefined;
}
