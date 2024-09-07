// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainAsset, _ChainInfo } from '@subwallet/chain-list/types';
import { _getContractAddressOfToken, _getEvmChainId } from '@subwallet/extension-base/services/chain-service/utils';
import { Abi } from 'abitype/src/abi';
import { batchTx, BiconomyV2AccountInitData, BridgePlugin, BridgePluginParams, buildItx, buildMultichainReadonlyClient, buildRpcInfo, buildTokenMapping, deployment, encodeApproveTx, initKlaster, klasterNodeHost, KlasterSDK, loadBicoV2Account, MultichainClient, MultichainTokenMapping, QuoteResponse, rawTx } from 'klaster-sdk';
import { encodeFunctionData, Hex, parseAbi } from 'viem';

export interface AcrossSuggestedFeeResp {
  totalRelayFee: {
    pct: string,
    total: string
  },
  relayerCapitalFee: {
    pct: string,
    total: string
  },
  relayerGasFee: {
    pct: string,
    total: string
  },
  lpFee: {
    pct: string,
    total: string
  },
  timestamp: string,
  isAmountTooLow: boolean,
  quoteBlock: string,
  spokePoolAddress: string,
  exclusiveRelayer: string,
  exclusivityDeadline: string,
  expectedFillTimeSec: string
}

function encodeAcrossCallData (data: BridgePluginParams, fees: AcrossSuggestedFeeResp): Hex {
  // @ts-ignore
  const abi = parseAbi([
    'function depositV3(address depositor, address recipient, address inputToken, address outputToken, uint256 inputAmount, uint256 outputAmount, uint256 destinationChainId, address exclusiveRelayer, uint32 quoteTimestamp, uint32 fillDeadline, uint32 exclusivityDeadline, bytes calldata message) external'
  ]) as Abi;
  const outputAmount = data.amount - BigInt(fees.totalRelayFee.total);
  const fillDeadline = Math.round(Date.now() / 1000) + 300;

  const [srcAddress, destAddress] = data.account.getAddresses([data.sourceChainId, data.destinationChainId]);

  if (!srcAddress || !destAddress) {
    throw Error(`Can't fetch address from multichain account for ${data.sourceChainId} or ${data.destinationChainId}`);
  }

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return encodeFunctionData({
    abi: abi,
    functionName: 'depositV3',
    args: [
      srcAddress,
      destAddress,
      data.sourceToken,
      data.destinationToken,
      data.amount,
      outputAmount,
      BigInt(data.destinationChainId),
      fees.exclusiveRelayer,
      parseInt(fees.timestamp),
      fillDeadline,
      parseInt(fees.exclusivityDeadline),
      '0x'
    ]
  });
}

export class KlasterService {
  public sdk: KlasterSDK<BiconomyV2AccountInitData>;
  private mcClient: MultichainClient;
  private mcUSDC: MultichainTokenMapping;
  private bridgePlugin: BridgePlugin;

  static async getSmartAccount (ownerAddress: string): Promise<string> {
    const klasterSdk = await initKlaster({
      accountInitData: loadBicoV2Account({
        owner: ownerAddress
      }),
      nodeUrl: klasterNodeHost.default
    });

    return klasterSdk.account.getAddress(1) as string;
  }

  constructor () {
    this.mcClient = buildMultichainReadonlyClient([
      buildRpcInfo(11155111, 'https://rpc.sepolia.org'),
      buildRpcInfo(84532, 'https://sepolia.base.org')
    ]);

    this.mcUSDC = buildTokenMapping([
      deployment(1, '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'),
      deployment(8453, '0x036CbD53842c5426634e7929541eC2318f3dCF7e')
    ]);

    this.bridgePlugin = async (data: BridgePluginParams) => {
      const url = 'https://testnet.across.to/api/suggested-fees?' + new URLSearchParams({
        originChainId: data.sourceChainId.toString(),
        destinationChainId: data.destinationChainId.toString(),
        inputToken: data.sourceToken,
        outputToken: data.destinationToken,
        amount: data.amount.toString()
      }).toString();

      console.log('url', url);

      const feeResponse = await fetch(url, {
        method: 'GET'
      })
        .then((res) => res.json()) as AcrossSuggestedFeeResp;

      console.log(feeResponse);

      const outputAmount = data.amount - BigInt(feeResponse.totalRelayFee.total);
      const acrossApproveTx = encodeApproveTx({
        tokenAddress: data.sourceToken,
        amount: outputAmount,
        recipient: feeResponse.spokePoolAddress
      });

      const acrossCallTx = rawTx({
        to: feeResponse.spokePoolAddress as `0x${string}`,
        data: encodeAcrossCallData(data, feeResponse),
        gasLimit: BigInt(250_000)
      });

      return {
        receivedOnDestination: outputAmount,
        txBatch: batchTx(data.sourceChainId, [acrossApproveTx, acrossCallTx])
      };
    };
  }

  async init () {
    this.sdk = await initKlaster({
      accountInitData: loadBicoV2Account({
        owner: '0xA34AFc7Cc7B06AA528d5170452585999990f8C27'
      }),
      nodeUrl: klasterNodeHost.default
    });
  }

  async getBridgeTx (srcToken: _ChainAsset, destToken: _ChainAsset, srcChain: _ChainInfo, destChain: _ChainInfo, value: string): Promise<QuoteResponse> {
    const res = await this.bridgePlugin({
      account: this.sdk.account,
      amount: BigInt(value),
      sourceChainId: _getEvmChainId(srcChain) as number,
      destinationChainId: _getEvmChainId(destChain) as number,
      sourceToken: _getContractAddressOfToken(srcToken) as `0x${string}`,
      destinationToken: _getContractAddressOfToken(destToken) as `0x${string}`
    });

    const iTx = buildItx({
      steps: [res.txBatch],
      feeTx: this.sdk.encodePaymentFee(_getEvmChainId(srcChain) as number, 'USDC')
    });

    const quote = await this.sdk.getQuote(iTx);

    console.log(quote);

    return quote;
  }
}
