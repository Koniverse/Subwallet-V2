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
    } else if (to === 'arbitrum_one-ERC20-USDC-0xaf88d065e77c8cC2239327C5EDb3A432268e5831') {
      to = 'base_mainnet-ERC20-USDC-0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
    } else if (to === 'base_mainnet-ERC20-USDC-0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913') {
      to = 'arbitrum_one-ERC20-USDC-0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
    } else if (to === 'optimism-ERC20-DAI-0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1') {
      if (from === 'base_mainnet-ERC20-USDC-0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913') {
        to = 'base_mainnet-ERC20-DAI-0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb';
      } else {
        to = 'arbitrum_one-ERC20-DAI-0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1';
      }
    }

    const fromToken = this.swapBaseHandler.chainService.getAssetBySlug(from);
    const toToken = this.swapBaseHandler.chainService.getAssetBySlug(to);
    const fromChain = this.swapBaseHandler.chainService.getChainInfoByKey(fromToken.originChain);

    const { quote: availQuote } = await handleUniswapQuote(request, this.swapBaseHandler.chainService.getEvmApi(fromChain.slug), this.swapBaseHandler.chainService);
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
    let bridgeTokenSlug = '0x';
    const fromChain = this.swapBaseHandler.chainService.getChainInfoByKey(fromToken.originChain);
    const chainId = _getEvmChainId(fromChain) || 0;

    if (toTokenSlug === 'base_sepolia-ERC20-WETH-0x4200000000000000000000000000000000000006') {
      bridgeTokenSlug = 'sepolia_ethereum-ERC20-WETH-0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14';
    } else if (toTokenSlug === 'arbitrum_one-ERC20-USDC-0xaf88d065e77c8cC2239327C5EDb3A432268e5831') {
      bridgeTokenSlug = 'base_mainnet-ERC20-USDC-0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
    } else if (toTokenSlug === 'base_mainnet-ERC20-USDC-0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913') {
      bridgeTokenSlug = 'arbitrum_one-ERC20-USDC-0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
    } else if (toTokenSlug === 'optimism-ERC20-DAI-0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1') {
      if (fromTokenSlug === 'base_mainnet-ERC20-USDC-0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913') {
        bridgeTokenSlug = 'base_mainnet-ERC20-DAI-0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb';
      } else {
        bridgeTokenSlug = 'arbitrum_one-ERC20-DAI-0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1';
      }
    }

    // const toAddress = SWAP_ROUTER_02_ADDRESSES(chainId);

    const evmApi = this.swapBaseHandler.chainService.getEvmApi(fromToken.originChain);
    const { callData, routerAddress: toAddress } = await handleUniswapQuote(request, evmApi, this.swapBaseHandler.chainService);

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
        data: callData as `0x${string}`,
        gasLimit: BigInt(250_000)
      });
      const txBatch = batchTx(chainId, [approveSwapTx, swapTx]);

      const klasterService = new KlasterService();

      await klasterService.init(owner?.owner as string);

      if (bridgeTokenSlug === '0x') {
        tx = await klasterService.buildTx(fromChain, [txBatch]);
      } else {
        const bridgeOriginToken = this.swapBaseHandler.chainService.getAssetBySlug(bridgeTokenSlug);
        const bridgeOriginChain = this.swapBaseHandler.chainService.getChainInfoByKey(bridgeOriginToken.originChain);
        const bridgeDestChain = this.swapBaseHandler.chainService.getChainInfoByKey(toToken.originChain);

        tx = await klasterService.getBridgeTx(bridgeOriginToken, toToken, bridgeOriginChain, bridgeDestChain, params.quote.toAmount, txBatch);
      }
    } else {
      const swapApprovalTxConfig = await getERC20SpendingApprovalTx(toAddress, params.address, _getContractAddressOfToken(fromToken), evmApi);

      const swapTxConfig: TransactionConfig = {
        ...swapApprovalTxConfig,
        gas: 250_000,
        data: callData as `0x${string}`,
        to: toAddress as `0x${string}`
      };

      if (bridgeTokenSlug === '0x') {
        tx = await ParticleAAHandler.createUserOperation(_getEvmChainId(fromChain) as number, owner as SmartAccountData, [swapApprovalTxConfig, swapTxConfig]);
      } else {
        const bridgeOriginToken = this.swapBaseHandler.chainService.getAssetBySlug(bridgeTokenSlug);
        const bridgeOriginChain = this.swapBaseHandler.chainService.getChainInfoByKey(bridgeOriginToken.originChain);
        const bridgeDestChain = this.swapBaseHandler.chainService.getChainInfoByKey(toToken.originChain);
        const [feeResp, bridgeTxConfig] = await getAcrossBridgeData({
          amount: BigInt(params.quote.toAmount),
          srcAccount: request.address,
          sourceChainId: _getEvmChainId(bridgeOriginChain) as number,
          sourceTokenContract: _getContractAddressOfToken(bridgeOriginToken),
          destAccount: request.address,
          destinationChainId: _getEvmChainId(bridgeDestChain) as number,
          destinationTokenContract: _getContractAddressOfToken(toToken),
          isTestnet: this.isTestnet
        });
        const bridgeApprovalTxConfig = await getERC20SpendingApprovalTx(feeResp.spokePoolAddress, params.address, _getContractAddressOfToken(bridgeOriginToken), evmApi);

        tx = await ParticleAAHandler.createUserOperation(_getEvmChainId(fromChain) as number, owner as SmartAccountData, [
          swapApprovalTxConfig,
          swapTxConfig,
          bridgeApprovalTxConfig,
          bridgeTxConfig
        ]);
      }
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
