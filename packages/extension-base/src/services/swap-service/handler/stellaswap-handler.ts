// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import stellaSwap from '@stellaswap/swap-sdk';
import { COMMON_CHAIN_SLUGS } from '@subwallet/chain-list';
import { _AssetType, _ChainAsset } from '@subwallet/chain-list/types';
import { SwapError } from '@subwallet/extension-base/background/errors/SwapError';
import { TransactionError } from '@subwallet/extension-base/background/errors/TransactionError';
import { BasicTxErrorType, ChainType, ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import { _getEarlyHydradxValidationError } from '@subwallet/extension-base/core/logic-validation/swap';
import { getERC20ApproveTransaction } from '@subwallet/extension-base/koni/api/tokens/evm/transfer';
import { getERC20Contract } from '@subwallet/extension-base/koni/api/tokens/evm/web3';
import { BalanceService } from '@subwallet/extension-base/services/balance-service';
import { ChainService } from '@subwallet/extension-base/services/chain-service';
import { _getChainNativeTokenSlug, _getContractAddressOfToken, _isNativeToken, _isSmartContractToken } from '@subwallet/extension-base/services/chain-service/utils';
import { SwapBaseHandler, SwapHandlerInterface } from '@subwallet/extension-base/services/swap-service/handler/base-handler';
import { calculateSwapRate, SWAP_QUOTE_TIMEOUT_MAP } from '@subwallet/extension-base/services/swap-service/utils';
import { BaseStepDetail } from '@subwallet/extension-base/types/service-base';
import { HydradxPreValidationMetadata, OptimalSwapPath, OptimalSwapPathParams, StellaswapPreValidationMetadata, SwapBaseTxData, SwapEarlyValidation, SwapErrorType, SwapFeeInfo, SwapProviderId, SwapQuote, SwapRequest, SwapRoute, SwapStepType, SwapSubmitParams, SwapSubmitStepData, ValidateSwapProcessParams } from '@subwallet/extension-base/types/swap';
import BigNumber from 'bignumber.js';

// const STELLASWAP_LOW_LIQUIDITY_THRESHOLD = 0.15; // in percentage

interface StellaswapQuoteResp {
  isSuccess: boolean;
  code: number;
  message: string;
  result: StellaswapQuoteResult;
}

interface StellaswapQuoteResult {
  amountOut: string,
  amountOutBn: BigNumber,
  amountOutOriginal: string,
  amountWei: string,
  execution: {
    commands: unknown[],
    inputs: string[]
  },
  fromToken: string,
  midPrice: string,
  outputWithoutSlippage: string,
  toToken: string,
  trades: StellaswapTrade[]
}

interface StellaswapTrade {
  amountIn: string,
  amountOut: string,
  amountOutBn: BigNumber,
  amountOutOriginal: string,
  fromToken: string,
  path: string[],
  protocol: string,
  toToken: string,
  type: string
}

const STELLASWAP_NATIVE_TOKEN_ID = 'ETH';

export class StellaswapHandler implements SwapHandlerInterface {
  private swapBaseHandler: SwapBaseHandler;
  isTestnet: boolean;
  providerSlug: SwapProviderId;

  constructor (chainService: ChainService, balanceService: BalanceService, isTestnet = true) { // todo: pass in baseHandler from service
    this.providerSlug = isTestnet ? SwapProviderId.STELLASWAP_TESTNET : SwapProviderId.STELLASWAP;
    this.swapBaseHandler = new SwapBaseHandler({
      balanceService,
      chainService,
      providerName: isTestnet ? 'Stellaswap Testnet' : 'Stellaswap',
      providerSlug: this.providerSlug
    });

    this.isTestnet = isTestnet;
  }

  chain = (): string => {
    if (!this.isTestnet) {
      return COMMON_CHAIN_SLUGS.MOONBEAM;
    } else {
      return COMMON_CHAIN_SLUGS.MOONBASE;
    }
  };

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

  generateOptimalProcess (params: OptimalSwapPathParams): Promise<OptimalSwapPath> {
    return this.swapBaseHandler.generateOptimalProcess(params, [
      this.getApproveStep.bind(this),
      this.getSubmitStep.bind(this)
    ]);
  }

  async getApproveStep (params: OptimalSwapPathParams): Promise<[BaseStepDetail, SwapFeeInfo] | undefined> {
    const pair = params.request.pair;
    const fromAsset = this.chainService.getAssetBySlug(pair.from);

    if (_isNativeToken(fromAsset)) {
      return Promise.resolve(undefined);
    }

    const fromAssetAddress = _getContractAddressOfToken(fromAsset);

    const fromChain = this.chainService.getChainInfoByKey(fromAsset.originChain);
    const fromChainNativeTokenSlug = _getChainNativeTokenSlug(fromChain);

    if (fromAssetAddress.length === 0) {
      return Promise.resolve(undefined);
    }

    const contractAddresses = await stellaSwap.getAddresses();
    const evmApi = this.chainService.getEvmApi(fromAsset.originChain);
    const erc20Contract = getERC20Contract(fromAssetAddress, evmApi);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
    const allowance = await erc20Contract?.methods.allowance(params.request.address, contractAddresses.permit2).call() as string;

    // const allowance = await stellaSwap.checkAllowance(fromAssetAddress, erc20Contract, contractAddresses.permit2) as string;
    const bnAllowance = new BigNumber(allowance);
    const bnAmount = new BigNumber(params.request.fromAmount);

    if (!allowance || bnAmount.gt(bnAllowance)) {
      const fee: SwapFeeInfo = {
        feeComponent: [],
        defaultFeeToken: fromChainNativeTokenSlug, // token to pay transaction fee with
        feeOptions: [fromChainNativeTokenSlug], // list of tokenSlug, always include defaultFeeToken
        selectedFeeToken: fromChainNativeTokenSlug
      };

      const step: BaseStepDetail = {
        type: SwapStepType.TOKEN_APPROVAL,
        name: 'Authorize token approval'
      };

      return [step, fee];
    }

    return undefined;
  }

  async getSubmitStep (params: OptimalSwapPathParams): Promise<[BaseStepDetail, SwapFeeInfo] | undefined> {
    if (!params.selectedQuote) {
      return Promise.resolve(undefined);
    }

    if (params.selectedQuote) {
      const submitStep = {
        name: 'Swap',
        type: SwapStepType.SWAP
      };

      return Promise.resolve([submitStep, params.selectedQuote.feeInfo]);
    }

    return Promise.resolve(undefined);
  }

  private parseSwapPath (assetIn: string, assetOut: string, swapList: string[]): SwapRoute {
    try {
      const swapAssets = this.chainService.getAssetByChainAndType(this.chain(), [_AssetType.LOCAL, _AssetType.ERC20]);
      const nativeToken = this.chainService.getNativeTokenInfo(this.chain());

      const swapAssetContractMap: Record<string, _ChainAsset> = Object.values(swapAssets).reduce((accumulator, asset) => {
        return {
          ...accumulator,
          [_getContractAddressOfToken(asset).toLowerCase()]: asset // Local tokens might not have contract address
        };
      }, { ETH: nativeToken });

      const path: string[] = [assetIn];

      swapList.forEach((contractAddress) => {
        const swapAssetIn = swapAssetContractMap[contractAddress.toLowerCase()]?.slug;
        const swapAssetOut = swapAssetContractMap[contractAddress.toLowerCase()]?.slug;

        if (swapAssetIn && !path.includes(swapAssetIn)) {
          path.push(swapAssetIn);
        }

        if (swapAssetOut && !path.includes(swapAssetOut)) {
          path.push(swapAssetOut);
        }
      });

      if (path[path.length - 1] !== assetOut) {
        path.push(assetOut);
      }

      return {
        path
      };
    } catch (e) {
      return {
        path: [assetIn, assetOut]
      };
    }
  }

  async getSwapQuote (request: SwapRequest): Promise<SwapQuote | SwapError> {
    const fromAsset = this.chainService.getAssetBySlug(request.pair.from);
    const toAsset = this.chainService.getAssetBySlug(request.pair.to);
    const fromAssetAddress = _isNativeToken(fromAsset) ? STELLASWAP_NATIVE_TOKEN_ID : _getContractAddressOfToken(fromAsset);
    const toAssetAddress = _isNativeToken(toAsset) ? STELLASWAP_NATIVE_TOKEN_ID : _getContractAddressOfToken(toAsset);

    const fromChain = this.chainService.getChainInfoByKey(fromAsset.originChain);
    const fromChainNativeTokenSlug = _getChainNativeTokenSlug(fromChain);

    const earlyValidation = await this.validateSwapRequest(request);

    if (earlyValidation.error) {
      const metadata = earlyValidation.metadata as HydradxPreValidationMetadata;

      return _getEarlyHydradxValidationError(earlyValidation.error, metadata);
    }

    try {
      const quote = await stellaSwap.getQuote(fromAssetAddress, toAssetAddress, request.fromAmount, request.address, (request.slippage * 100).toString()) as StellaswapQuoteResp;

      const toAmount = quote.result.amountOut;
      const swapPath = this.parseSwapPath(fromAsset.slug, toAsset.slug, quote.result.trades[0].path);

      return Promise.resolve({
        pair: request.pair,
        fromAmount: request.fromAmount,
        toAmount,
        rate: calculateSwapRate(request.fromAmount, toAmount, fromAsset, toAsset),
        provider: this.providerInfo,
        aliveUntil: +Date.now() + (SWAP_QUOTE_TIMEOUT_MAP[this.slug] || SWAP_QUOTE_TIMEOUT_MAP.default),
        feeInfo: {
          feeComponent: [],
          defaultFeeToken: fromChainNativeTokenSlug,
          feeOptions: [fromChainNativeTokenSlug]
        },
        isLowLiquidity: false,
        route: swapPath
      } as SwapQuote);
    } catch (e) {
      return new SwapError(SwapErrorType.ERROR_FETCHING_QUOTE);
    }
  }

  async handleSubmitStep (params: SwapSubmitParams): Promise<SwapSubmitStepData> {
    const { address, quote, recipient } = params;

    const fromAsset = this.chainService.getAssetBySlug(params.quote.pair.from);
    const toAsset = this.chainService.getAssetBySlug(params.quote.pair.to);
    const fromAssetAddress = _isNativeToken(fromAsset) ? STELLASWAP_NATIVE_TOKEN_ID : _getContractAddressOfToken(fromAsset);
    const toAssetAddress = _isNativeToken(toAsset) ? STELLASWAP_NATIVE_TOKEN_ID : _getContractAddressOfToken(toAsset);

    const getTransactionPromise = (signer: any): Promise<any> => {
      return stellaSwap.executeSwap(
        fromAssetAddress,
        toAssetAddress,
        params.quote.fromAmount,
        signer,
        (params.slippage * 100).toString()
      );
    };

    const txData: SwapBaseTxData = {
      address,
      provider: this.providerInfo,
      quote: params.quote,
      slippage: params.slippage,
      recipient,
      process: params.process
    };

    return Promise.resolve({
      txChain: fromAsset.originChain,
      txData,
      extrinsic: getTransactionPromise,
      transferNativeAmount: _isNativeToken(fromAsset) ? quote.fromAmount : '0', // todo
      extrinsicType: ExtrinsicType.SWAP,
      chainType: ChainType.EVM
    } as SwapSubmitStepData);
  }

  async handleTokenApprovalStep (params: SwapSubmitParams): Promise<SwapSubmitStepData> {
    const { address, quote } = params;
    const fromAsset = this.chainService.getAssetBySlug(quote.pair.from);
    const evmApi = this.chainService.getEvmApi(this.chain());

    const contractAddresses = await stellaSwap.getAddresses();
    const approveTransaction = await getERC20ApproveTransaction(_getContractAddressOfToken(fromAsset), this.chainService.getChainInfoByKey(this.chain()), address, contractAddresses.permit2, evmApi, params.quote.fromAmount);

    return {
      txChain: fromAsset.originChain,
      txData: null,
      extrinsic: approveTransaction,
      transferNativeAmount: _isNativeToken(fromAsset) ? quote.fromAmount : '0', // todo
      extrinsicType: ExtrinsicType.SWAP,
      chainType: ChainType.EVM
    } as SwapSubmitStepData;
  }

  handleSwapProcess (params: SwapSubmitParams): Promise<SwapSubmitStepData> {
    const { currentStep, process } = params;
    const type = process.steps[currentStep].type;

    switch (type) {
      case SwapStepType.DEFAULT:
        return Promise.reject(new TransactionError(BasicTxErrorType.UNSUPPORTED));
      case SwapStepType.XCM:
        return Promise.reject(new TransactionError(BasicTxErrorType.INTERNAL_ERROR));
      case SwapStepType.TOKEN_APPROVAL:
        return this.handleTokenApprovalStep(params);
      case SwapStepType.SET_FEE_TOKEN:
        return Promise.reject(new TransactionError(BasicTxErrorType.UNSUPPORTED));
      case SwapStepType.SWAP:
        return this.handleSubmitStep(params);
      default:
        return this.handleSubmitStep(params);
    }
  }

  validateSwapProcess (params: ValidateSwapProcessParams): Promise<TransactionError[]> {
    return Promise.resolve([]);
  }

  async validateSwapRequest (request: SwapRequest): Promise<SwapEarlyValidation> {
    const fromAsset = this.chainService.getAssetBySlug(request.pair.from);
    const toAsset = this.chainService.getAssetBySlug(request.pair.to);

    if (fromAsset.originChain !== this.chain() || toAsset.originChain !== this.chain()) {
      return Promise.resolve({
        error: SwapErrorType.ASSET_NOT_SUPPORTED
      });
    }

    if (_isSmartContractToken(fromAsset) && _getContractAddressOfToken(fromAsset).length === 0) {
      return Promise.resolve({
        error: SwapErrorType.UNKNOWN
      });
    }

    if (_isSmartContractToken(toAsset) && _getContractAddressOfToken(toAsset).length === 0) {
      return Promise.resolve({
        error: SwapErrorType.UNKNOWN
      });
    }

    try {
      const bnAmount = new BigNumber(request.fromAmount);

      if (bnAmount.lte(0)) {
        return Promise.resolve({
          error: SwapErrorType.AMOUNT_CANNOT_BE_ZERO
        });
      }

      return Promise.resolve({
        metadata: {
          chain: this.chainService.getChainInfoByKey(this.chain())
        } as StellaswapPreValidationMetadata
      });
    } catch (e) {
      return Promise.resolve({
        error: SwapErrorType.UNKNOWN
      });
    }
  }
}
