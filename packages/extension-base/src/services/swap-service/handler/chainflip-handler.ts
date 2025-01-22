// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { Asset, SwapSDK } from '@chainflip/sdk/swap';
import { COMMON_ASSETS } from '@subwallet/chain-list';
import { TransactionError } from '@subwallet/extension-base/background/errors/TransactionError';
import { ChainType, ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import { BalanceService } from '@subwallet/extension-base/services/balance-service';
import { getERC20TransactionObject, getEVMTransactionObject } from '@subwallet/extension-base/services/balance-service/transfer/smart-contract';
import { createTransferExtrinsic } from '@subwallet/extension-base/services/balance-service/transfer/token';
import { ChainService } from '@subwallet/extension-base/services/chain-service';
import { _getAssetSymbol, _getContractAddressOfToken, _isChainSubstrateCompatible, _isNativeToken } from '@subwallet/extension-base/services/chain-service/utils';
import { SwapBaseHandler, SwapBaseInterface } from '@subwallet/extension-base/services/swap-service/handler/base-handler';
import { CHAIN_FLIP_SUPPORTED_MAINNET_ASSET_MAPPING, CHAIN_FLIP_SUPPORTED_MAINNET_MAPPING, CHAIN_FLIP_SUPPORTED_TESTNET_ASSET_MAPPING, CHAIN_FLIP_SUPPORTED_TESTNET_MAPPING, getChainflipOptions } from '@subwallet/extension-base/services/swap-service/utils';
import { BasicTxErrorType, TransactionData } from '@subwallet/extension-base/types';
import { BaseStepDetail, CommonOptimalPath, CommonStepFeeInfo, CommonStepType } from '@subwallet/extension-base/types/service-base';
import { ChainflipSwapTxData, OptimalSwapPathParams, SwapProviderId, SwapStepType, SwapSubmitParams, SwapSubmitStepData, ValidateSwapProcessParams } from '@subwallet/extension-base/types/swap';
import BigNumber from 'bignumber.js';

import { SubmittableExtrinsic } from '@polkadot/api/types';

const INTERMEDIARY_MAINNET_ASSET_SLUG = COMMON_ASSETS.USDC_ETHEREUM;
const INTERMEDIARY_TESTNET_ASSET_SLUG = COMMON_ASSETS.USDC_SEPOLIA;

export const CHAINFLIP_BROKER_API = process.env.CHAINFLIP_BROKER_API || '';

export class ChainflipSwapHandler implements SwapBaseInterface {
  private swapSdk: SwapSDK;
  private readonly isTestnet: boolean;
  private swapBaseHandler: SwapBaseHandler;
  providerSlug: SwapProviderId;

  constructor (chainService: ChainService, balanceService: BalanceService, isTestnet = true) {
    this.swapBaseHandler = new SwapBaseHandler({
      chainService,
      balanceService,
      providerName: isTestnet ? 'Chainflip Testnet' : 'Chainflip',
      providerSlug: isTestnet ? SwapProviderId.CHAIN_FLIP_TESTNET : SwapProviderId.CHAIN_FLIP_MAINNET
    });
    this.isTestnet = isTestnet;
    this.providerSlug = isTestnet ? SwapProviderId.CHAIN_FLIP_TESTNET : SwapProviderId.CHAIN_FLIP_MAINNET;

    // @ts-ignore
    this.swapSdk = new SwapSDK(getChainflipOptions(isTestnet));
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

  get assetMapping () {
    if (this.isTestnet) {
      return CHAIN_FLIP_SUPPORTED_TESTNET_ASSET_MAPPING;
    } else {
      return CHAIN_FLIP_SUPPORTED_MAINNET_ASSET_MAPPING;
    }
  }

  get chainMapping () {
    if (this.isTestnet) {
      return CHAIN_FLIP_SUPPORTED_TESTNET_MAPPING;
    } else {
      return CHAIN_FLIP_SUPPORTED_MAINNET_MAPPING;
    }
  }

  get intermediaryAssetSlug () {
    if (this.isTestnet) {
      return INTERMEDIARY_TESTNET_ASSET_SLUG;
    } else {
      return INTERMEDIARY_MAINNET_ASSET_SLUG;
    }
  }

  public async validateSwapProcess (params: ValidateSwapProcessParams): Promise<TransactionError[]> {
    const amount = params.selectedQuote.fromAmount;
    const bnAmount = new BigNumber(amount);

    if (bnAmount.lte(0)) {
      return [new TransactionError(BasicTxErrorType.INVALID_PARAMS, 'Amount must be greater than 0')];
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

  public async handleSubmitStep (params: SwapSubmitParams): Promise<SwapSubmitStepData> {
    const { address, quote, recipient, slippage } = params;

    const pair = quote.pair;
    const fromAsset = this.chainService.getAssetBySlug(pair.from);
    const toAsset = this.chainService.getAssetBySlug(pair.to);
    const chainInfo = this.chainService.getChainInfoByKey(fromAsset.originChain);
    const chainType = _isChainSubstrateCompatible(chainInfo) ? ChainType.SUBSTRATE : ChainType.EVM;
    const receiver = recipient ?? address;

    const srcChainId = this.chainMapping[fromAsset.originChain];
    const destChainId = this.chainMapping[toAsset.originChain];

    const fromAssetId = _getAssetSymbol(fromAsset);
    const toAssetId = _getAssetSymbol(toAsset);

    const minReceive = new BigNumber(quote.rate).times(1 - slippage).toString();

    const depositAddressResponse = await this.swapSdk.requestDepositAddress({
      srcChain: srcChainId,
      destChain: destChainId,
      srcAsset: fromAssetId as Asset,
      destAsset: toAssetId as Asset,
      destAddress: receiver,
      amount: quote.fromAmount,
      fillOrKillParams: {
        minPrice: minReceive, // minimum accepted price for swaps through the channel
        refundAddress: address, // address to which assets are refunded
        retryDurationBlocks: 100 // 100 blocks * 6 seconds = 10 minutes before deposits are refunded
      }
    });

    const txData: ChainflipSwapTxData = {
      address,
      provider: this.providerInfo,
      quote: params.quote,
      slippage: params.slippage,
      recipient,
      depositChannelId: depositAddressResponse.depositChannelId,
      depositAddress: depositAddressResponse.depositAddress,
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
        to: depositAddressResponse.depositAddress,
        tokenInfo: fromAsset,
        transferAll: false, // always false, because we do not allow swapping all the balance
        value: quote.fromAmount
      });

      extrinsic = submittableExtrinsic as SubmittableExtrinsic<'promise'>;
    } else {
      if (_isNativeToken(fromAsset)) {
        const [transactionConfig] = await getEVMTransactionObject(chainInfo, address, depositAddressResponse.depositAddress, quote.fromAmount, false, this.chainService.getEvmApi(chainInfo.slug));

        extrinsic = transactionConfig;
      } else {
        const [transactionConfig] = await getERC20TransactionObject(_getContractAddressOfToken(fromAsset), chainInfo, address, depositAddressResponse.depositAddress, quote.fromAmount, false, this.chainService.getEvmApi(chainInfo.slug));

        extrinsic = transactionConfig;
      }
    }

    return {
      txChain: fromAsset.originChain,
      txData,
      extrinsic,
      transferNativeAmount: _isNativeToken(fromAsset) ? quote.fromAmount : '0', // todo
      extrinsicType: ExtrinsicType.SWAP,
      chainType
    } as SwapSubmitStepData;
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

  generateOptimalProcess (params: OptimalSwapPathParams): Promise<CommonOptimalPath> {
    return this.swapBaseHandler.generateOptimalProcess(params, [
      this.getSubmitStep
    ]);
  }
}
