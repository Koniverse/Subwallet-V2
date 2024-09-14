// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { UserOpBundle } from '@particle-network/aa';
import { SwapError } from '@subwallet/extension-base/background/errors/SwapError';
import { TransactionError } from '@subwallet/extension-base/background/errors/TransactionError';
import { BasicTxErrorType, ChainType, ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import { SmartAccountData } from '@subwallet/extension-base/background/types';
import { getERC20SpendingApprovalTx } from '@subwallet/extension-base/koni/api/contract-handler/evm/web3';
import { BalanceService } from '@subwallet/extension-base/services/balance-service';
import { getAcrossBridgeData } from '@subwallet/extension-base/services/chain-abstraction-service/helper/tx-encoder';
import { CAProvider } from '@subwallet/extension-base/services/chain-abstraction-service/helper/util';
import { KlasterService } from '@subwallet/extension-base/services/chain-abstraction-service/klaster';
import { ParticleAAHandler } from '@subwallet/extension-base/services/chain-abstraction-service/particle';
import { ChainService } from '@subwallet/extension-base/services/chain-service';
import { _getChainNativeTokenSlug, _getContractAddressOfToken, _getEvmChainId } from '@subwallet/extension-base/services/chain-service/utils';
import { SwapBaseHandler, SwapBaseInterface } from '@subwallet/extension-base/services/swap-service/handler/base-handler';
import { calculateSwapRate, handleUniswapQuote, SWAP_QUOTE_TIMEOUT_MAP } from '@subwallet/extension-base/services/swap-service/utils';
import { BaseStepDetail, CommonOptimalPath, CommonStepFeeInfo, CommonStepType, DEFAULT_FIRST_STEP, MOCK_STEP_FEE } from '@subwallet/extension-base/types/service-base';
import { OptimalSwapPathParams, SwapEarlyValidation, SwapFeeType, SwapProviderId, SwapQuote, SwapRequest, SwapStepType, SwapSubmitParams, SwapSubmitStepData, ValidateSwapProcessParams } from '@subwallet/extension-base/types/swap';
import { getEthereumSmartAccountOwner } from '@subwallet/extension-base/utils';
import { CHAIN_TO_ADDRESSES_MAP, ChainId } from '@uniswap/sdk-core';
import { batchTx, encodeApproveTx, QuoteResponse, rawTx } from 'klaster-sdk';
import { TransactionConfig } from 'web3-core';

export class UniswapHandler implements SwapBaseInterface {
  providerSlug: SwapProviderId;
  private swapBaseHandler: SwapBaseHandler;
  private readonly isTestnet: boolean = true;

  constructor (chainService: ChainService, balanceService: BalanceService, isTestnet = true) {
    this.swapBaseHandler = new SwapBaseHandler({
      balanceService,
      chainService,
      providerName: 'Uniswap',
      providerSlug: isTestnet ? SwapProviderId.UNISWAP_SEPOLIA : SwapProviderId.UNISWAP_ETHEREUM
    });
    this.providerSlug = isTestnet ? SwapProviderId.UNISWAP_SEPOLIA : SwapProviderId.UNISWAP_ETHEREUM;

    this.isTestnet = isTestnet;
  }

  get providerInfo () {
    return this.swapBaseHandler.providerInfo;
  }

  generateOptimalProcess (params: OptimalSwapPathParams): Promise<CommonOptimalPath> {
    const res: CommonOptimalPath = {
      totalFee: [
        MOCK_STEP_FEE,
        params.selectedQuote?.feeInfo || MOCK_STEP_FEE
      ],
      steps: [
        DEFAULT_FIRST_STEP,
        {
          id: 1,
          name: 'Swap',
          type: SwapStepType.SWAP
        }
      ]
    };

    return Promise.resolve(res);
  }

  getSubmitStep (params: OptimalSwapPathParams): Promise<[BaseStepDetail, CommonStepFeeInfo] | undefined> {
    return Promise.resolve(undefined);
  }

  async getSwapQuote (request: SwapRequest): Promise<SwapQuote | SwapError> {
    const { from, to: _to } = request.pair;
    let to = _to;

    if (to === 'base_sepolia-ERC20-WETH-0x4200000000000000000000000000000000000006') {
      to = 'sepolia_ethereum-ERC20-WETH-0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14';
    }

    const fromToken = this.swapBaseHandler.chainService.getAssetBySlug(from);
    const toToken = this.swapBaseHandler.chainService.getAssetBySlug(to);
    const fromChain = this.swapBaseHandler.chainService.getChainInfoByKey(fromToken.originChain);

    const [availQuote] = await handleUniswapQuote(request, this.swapBaseHandler.chainService.getEvmApi(fromChain.slug), this.swapBaseHandler.chainService);
    const result: SwapQuote = {
      pair: request.pair,
      fromAmount: request.fromAmount,
      toAmount: availQuote.toString(),
      rate: calculateSwapRate(request.fromAmount, availQuote.toString(), fromToken, toToken),
      provider: this.providerInfo,
      aliveUntil: +Date.now() + SWAP_QUOTE_TIMEOUT_MAP.default,
      feeInfo: {
        feeComponent: [
          {
            feeType: SwapFeeType.NETWORK_FEE,
            amount: '1000000',
            tokenSlug: fromToken.slug
          }
        ],
        defaultFeeToken: _getChainNativeTokenSlug(fromChain),
        feeOptions: [_getChainNativeTokenSlug(fromChain), fromToken.slug],
        selectedFeeToken: fromToken.slug
      },
      route: {
        path: [fromToken.slug, toToken.slug]
      }
    } as SwapQuote;

    return Promise.resolve(result);
  }

  async handleSubmitStep (params: SwapSubmitParams): Promise<SwapSubmitStepData> {
    const request: SwapRequest = {
      address: params.address,
      fromAmount: params.quote.fromAmount,
      pair: params.quote.pair,
      slippage: 0
    };
    const fromTokenSlug = params.quote.pair.from;
    const toTokenSlug = params.quote.pair.to;
    const fromToken = this.swapBaseHandler.chainService.getAssetBySlug(fromTokenSlug);
    const toToken = this.swapBaseHandler.chainService.getAssetBySlug(toTokenSlug);
    const bridgeOriginToken = this.swapBaseHandler.chainService.getAssetBySlug('sepolia_ethereum-ERC20-WETH-0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14');

    const bridgeOriginChain = this.swapBaseHandler.chainService.getChainInfoByKey(bridgeOriginToken.originChain);
    const bridgeDestChain = this.swapBaseHandler.chainService.getChainInfoByKey(toToken.originChain);
    const chainId = ChainId.SEPOLIA;

    const toAddress = CHAIN_TO_ADDRESSES_MAP[chainId].swapRouter02Address;

    const evmApi = this.swapBaseHandler.chainService.getEvmApi(fromToken.originChain);
    const [, calldata] = await handleUniswapQuote(request, evmApi, this.swapBaseHandler.chainService);

    const owner = getEthereumSmartAccountOwner(request.address);
    let tx: UserOpBundle | QuoteResponse;

    if (params.caProvider === CAProvider.KLASTER) {
      const approveSwapTx = encodeApproveTx({
        tokenAddress: _getContractAddressOfToken(fromToken) as `0x${string}`,
        amount: 10000000000000000000000n,
        recipient: toAddress as `0x${string}`
      });

      const swapTx = rawTx({
        to: toAddress as `0x${string}`,
        data: calldata as `0x${string}`,
        gasLimit: BigInt(250_000)
      });
      const txBatch = batchTx(chainId as number, [approveSwapTx, swapTx]);

      const klasterService = new KlasterService();

      await klasterService.init(owner?.owner as string);

      tx = await klasterService.getBridgeTx(bridgeOriginToken, toToken, bridgeOriginChain, bridgeDestChain, params.quote.toAmount, txBatch);
    } else {
      const spendingApprovalTxConfig = await getERC20SpendingApprovalTx(toAddress as string, params.address, _getContractAddressOfToken(fromToken), evmApi);

      const swapTxConfig: TransactionConfig = {
        ...spendingApprovalTxConfig,
        data: calldata as `0x${string}`,
        to: toAddress as `0x${string}`
      };

      const [, bridgeTxConfig] = await getAcrossBridgeData({
        amount: BigInt(params.quote.fromAmount),
        destAccount: request.address,
        destinationChainId: _getEvmChainId(bridgeDestChain) as number,
        destinationTokenContract: _getContractAddressOfToken(toToken),
        sourceChainId: _getEvmChainId(bridgeOriginChain) as number,
        sourceTokenContract: _getContractAddressOfToken(bridgeOriginToken),
        srcAccount: owner?.owner as string
      });

      tx = await ParticleAAHandler.createUserOperation(_getEvmChainId(bridgeOriginChain) as number, owner as SmartAccountData, [spendingApprovalTxConfig, swapTxConfig, bridgeTxConfig]);
    }

    return Promise.resolve({
      txChain: fromToken.originChain,
      extrinsic: tx,
      txData: undefined,
      transferNativeAmount: '0',
      extrinsicType: ExtrinsicType.SWAP,
      chainType: ChainType.EVM
    });
  }

  handleSwapProcess (params: SwapSubmitParams): Promise<SwapSubmitStepData> {
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

  validateSwapProcess (params: ValidateSwapProcessParams): Promise<TransactionError[]> {
    return Promise.resolve([]);
  }

  validateSwapRequest (request: SwapRequest): Promise<SwapEarlyValidation> {
    return Promise.resolve({});
  }
}
