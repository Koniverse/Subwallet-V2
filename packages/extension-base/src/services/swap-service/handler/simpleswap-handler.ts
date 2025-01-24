// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { _ChainAsset } from '@subwallet/chain-list/types';
import { SwapError } from '@subwallet/extension-base/background/errors/SwapError';
import { TransactionError } from '@subwallet/extension-base/background/errors/TransactionError';
import { ChainType, ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import { _getAssetDecimals, _getContractAddressOfToken, _isChainSubstrateCompatible, _isNativeToken } from '@subwallet/extension-base/services/chain-service/utils';
import { BaseStepDetail, BasicTxErrorType, CommonOptimalPath, CommonStepFeeInfo, CommonStepType, OptimalSwapPathParams, SimpleSwapTxData, SwapErrorType, SwapProviderId, SwapStepType, SwapSubmitParams, SwapSubmitStepData, TransactionData, ValidateSwapProcessParams } from '@subwallet/extension-base/types';
import { _reformatAddressWithChain, formatNumber } from '@subwallet/extension-base/utils';
import BigN, { BigNumber } from 'bignumber.js';

import { SubmittableExtrinsic } from '@polkadot/api/types';

import { BalanceService } from '../../balance-service';
import { getERC20TransactionObject, getEVMTransactionObject } from '../../balance-service/transfer/smart-contract';
import { createTransferExtrinsic } from '../../balance-service/transfer/token';
import { ChainService } from '../../chain-service';
import { SIMPLE_SWAP_SUPPORTED_TESTNET_ASSET_MAPPING } from '../utils';
import { SwapBaseHandler, SwapBaseInterface } from './base-handler';

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
