// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { SwapError } from '@subwallet/extension-base/background/errors/SwapError';
import { TransactionError } from '@subwallet/extension-base/background/errors/TransactionError';
import { BasicTxErrorType } from '@subwallet/extension-base/background/KoniTypes';
import { BalanceService } from '@subwallet/extension-base/services/balance-service';
import { ChainService } from '@subwallet/extension-base/services/chain-service';
import { _getAssetDecimals, _getAssetName, _getAssetSymbol, _getContractAddressOfToken } from '@subwallet/extension-base/services/chain-service/utils';
import { SwapBaseHandler, SwapBaseInterface } from '@subwallet/extension-base/services/swap-service/handler/base-handler';
import { SWAP_QUOTE_TIMEOUT_MAP } from '@subwallet/extension-base/services/swap-service/utils';
import { BaseStepDetail, CommonOptimalPath, CommonStepFeeInfo, CommonStepType, DEFAULT_FIRST_STEP, MOCK_STEP_FEE } from '@subwallet/extension-base/types/service-base';
import { OptimalSwapPathParams, SwapEarlyValidation, SwapFeeType, SwapProviderId, SwapQuote, SwapRequest, SwapStepType, SwapSubmitParams, SwapSubmitStepData, ValidateSwapProcessParams } from '@subwallet/extension-base/types/swap';
import {ChainId, QUOTER_ADDRESSES, Token, V3_CORE_FACTORY_ADDRESSES} from '@uniswap/sdk-core';
import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';
import {computePoolAddress, FeeAmount, Pool, Route} from '@uniswap/v3-sdk';
import Quoter from '@uniswap/v3-periphery/artifacts/contracts/lens/QuoterV2.sol/QuoterV2.json';
import {ethers, JsonRpcProvider} from "ethers";

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
    const chainId = ChainId.SEPOLIA;

    const fromContract = _getContractAddressOfToken(fromToken);
    const toContract = _getContractAddressOfToken(toToken);

    const currentPoolAddress = computePoolAddress({
      fee: FeeAmount.HIGH,
      tokenA: new Token(
        chainId,
        fromContract,
        _getAssetDecimals(fromToken),
        _getAssetSymbol(fromToken),
        _getAssetName(fromToken)
      ),
      tokenB: new Token(
        chainId,
        toContract,
        _getAssetDecimals(toToken),
        _getAssetSymbol(toToken),
        _getAssetName(toToken)
      ),
      factoryAddress: V3_CORE_FACTORY_ADDRESSES[chainId as number]
    });

    const web3Api = this.swapBaseHandler.chainService.getEvmApi(fromToken.originChain);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-member-access
    const poolContract = new web3Api.api.eth.Contract(IUniswapV3PoolABI.abi, currentPoolAddress);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-member-access
    const quoterContract = new web3Api.api.eth.Contract(Quoter.abi, QUOTER_ADDRESSES[chainId as number]);
    console.log('quoter', QUOTER_ADDRESSES[chainId as number]);

    const [token0, token1, fee, liquidity, slot0] = await Promise.all([
      poolContract.methods.token0().call(),
      poolContract.methods.token1().call(),
      poolContract.methods.fee().call(),
      poolContract.methods.liquidity().call(),
      poolContract.methods.slot0().call()
    ]);

    const provider = new ethers.JsonRpcProvider(web3Api.apiUrl);
    const quoterContract1 = new ethers.Contract(
      QUOTER_ADDRESSES[chainId as number],
      Quoter.abi,
      provider
    );

    try {
      const quotedAmountOut = await quoterContract1.quoteExactInputSingle.staticCall([
        fromContract,
        toContract,
        fee,
        request.fromAmount,
        toContract
      ]);
      console.log(quotedAmountOut);
    } catch (e) {
      console.log(e);
    }

    const pool = new Pool(
      fromContract,
      toContract,
      fee,
      slot0[0].toString(),
      liquidity.toString(),
      slot0[1]
    );

    const swapRoute = new Route(
      [pool],
      fromContract,
      toContract
    );

    const amountOut = await getOutputQuote()

    const result: SwapQuote = {
      pair: request.pair,
      fromAmount: request.fromAmount,
      toAmount: '999999999999999',
      rate: 1,
      provider: this.providerInfo,
      aliveUntil: +Date.now() + SWAP_QUOTE_TIMEOUT_MAP.default,
      feeInfo: {
        feeComponent: [
          {
            feeType: SwapFeeType.NETWORK_FEE,
            amount: '1000000',
            tokenSlug: 'base_sepolia-ERC20-USDC-0x036CbD53842c5426634e7929541eC2318f3dCF7e'
          }
        ],
        defaultFeeToken: 'base_sepolia-NATIVE-ETH',
        feeOptions: ['base_sepolia-NATIVE-ETH', 'base_sepolia-ERC20-USDC-0x036CbD53842c5426634e7929541eC2318f3dCF7e'],
        selectedFeeToken: 'base_sepolia-ERC20-USDC-0x036CbD53842c5426634e7929541eC2318f3dCF7e'
      },
      route: {
        path: ['base_sepolia-ERC20-USDC-0x036CbD53842c5426634e7929541eC2318f3dCF7e', 'sepolia_ethereum-NATIVE-ETH']
      }
    } as SwapQuote;

    return Promise.resolve(result);
  }

  handleSubmitStep (params: SwapSubmitParams): Promise<SwapSubmitStepData> {
    return Promise.resolve(undefined);
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
    return Promise.resolve(undefined);
  }
}
