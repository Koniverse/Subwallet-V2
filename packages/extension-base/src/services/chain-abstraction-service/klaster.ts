// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainAsset, _ChainInfo } from '@subwallet/chain-list/types';
import { _getContractAddressOfToken, _getEvmChainId } from '@subwallet/extension-base/services/chain-service/utils';
import { batchTx, BiconomyV2AccountInitData, BridgePlugin, BridgePluginParams, buildItx, encodeApproveTx, initKlaster, klasterNodeHost, KlasterSDK, loadBicoV2Account, QuoteResponse, rawTx, TransactionBatch } from 'klaster-sdk';

import { getAcrossBridgeData } from './helper/tx-encoder';

export class KlasterService {
  public sdk: KlasterSDK<BiconomyV2AccountInitData>;
  private readonly bridgePlugin: BridgePlugin;
  private isInit = false;

  static async getSmartAccount (ownerAddress: string): Promise<string> {
    const klasterSdk = await initKlaster({
      accountInitData: loadBicoV2Account({
        owner: ownerAddress as `0x${string}`
      }),
      nodeUrl: klasterNodeHost.default
    });

    return klasterSdk.account.getAddress(1) as string;
  }

  constructor () {
    this.bridgePlugin = async (data: BridgePluginParams) => {
      const [srcAddress, destAddress] = data.account.getAddresses([data.sourceChainId, data.destinationChainId]);

      const [feeResponse, bridgeTxConfig] = await getAcrossBridgeData({
        amount: data.amount,
        destAccount: destAddress as string,
        destinationChainId: data.destinationChainId,
        destinationTokenContract: data.destinationToken,
        sourceChainId: data.sourceChainId,
        sourceTokenContract: data.sourceToken,
        srcAccount: srcAddress as string
      });

      const outputAmount = data.amount - BigInt(feeResponse.totalRelayFee.total);
      const acrossApproveTx = encodeApproveTx({
        tokenAddress: data.sourceToken,
        amount: 10000000000000000000000n,
        recipient: feeResponse.spokePoolAddress as `0x${string}`
      });

      const acrossCallTx = rawTx({
        to: feeResponse.spokePoolAddress as `0x${string}`,
        data: bridgeTxConfig.data as `0x${string}`,
        gasLimit: BigInt(250_000)
      });

      return {
        receivedOnDestination: outputAmount,
        txBatch: batchTx(data.sourceChainId, [acrossApproveTx, acrossCallTx])
      };
    };
  }

  async init (ownerAddress: string) {
    if (!this.isInit) {
      this.sdk = await initKlaster({
        accountInitData: loadBicoV2Account({
          owner: ownerAddress as `0x${string}`
        }),
        nodeUrl: klasterNodeHost.default
      });

      this.isInit = true;
    }
  }

  async getBridgeTx (srcToken: _ChainAsset, destToken: _ChainAsset, srcChain: _ChainInfo, destChain: _ChainInfo, value: string, otherTx?: TransactionBatch): Promise<QuoteResponse> {
    const res = await this.bridgePlugin({
      account: this.sdk.account,
      amount: BigInt(value),
      sourceChainId: _getEvmChainId(srcChain) as number,
      destinationChainId: _getEvmChainId(destChain) as number,
      sourceToken: _getContractAddressOfToken(srcToken) as `0x${string}`,
      destinationToken: _getContractAddressOfToken(destToken) as `0x${string}`
    });

    const steps = [res.txBatch];

    otherTx && steps.push(otherTx);

    const iTx = buildItx({
      steps,
      feeTx: this.sdk.encodePaymentFee(_getEvmChainId(srcChain) as number, 'USDC')
    });

    const quote = await this.sdk.getQuote(iTx);

    console.log(quote);

    return quote;
  }
}
