// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AAProviderConfig, RawTransactionConfig } from '@subwallet/extension-base/types';
import { splitTransactionsBatches } from '@subwallet/extension-base/utils';
import { batchTx, buildItx, initKlaster, klasterNodeHost, KlasterSDK, loadBicoV2Account, QuoteResponse, RawTransaction, TransactionBatch } from 'klaster-sdk';
import { AccountInitData } from 'klaster-sdk/dist/accounts/account.service';

const createBatch = (chainId: number, txs: RawTransactionConfig[]): TransactionBatch => {
  return batchTx(
    chainId,
    txs.map((tx): RawTransaction => ({
      to: tx.to as `0x${string}`,
      data: tx.data as `0x${string}`,
      value: tx.value ? BigInt(tx.value) : undefined,
      gasLimit: BigInt(tx.gas)
    }))
  );
};

export class KlasterService {
  private sdk: KlasterSDK<AccountInitData<never>>;

  private constructor (sdk: KlasterSDK<AccountInitData<never>>) {
    this.sdk = sdk;
  }

  static async getSmartAccount (ownerAddress: string, config: AAProviderConfig): Promise<string> {
    const klasterSdk = await KlasterService.createSdk(ownerAddress, config);

    return klasterSdk.account.getAddress(1) as string;
  }

  private static async createSdk (ownerAddress: string, config: AAProviderConfig): Promise<KlasterSDK<AccountInitData<never>>> {
    const accountInitData = (() => {
      const { name, version } = config;

      if (version === '2.0.0' && name === 'BICONOMY') {
        return loadBicoV2Account({
          owner: ownerAddress as `0x${string}`
        });
      }

      throw Error('Unsupported account abstraction provider');
    })();

    return await initKlaster({
      accountInitData,
      nodeUrl: klasterNodeHost.default
    });
  }

  static async createKlasterService (ownerAddress: string, config: AAProviderConfig) {
    const sdk = await KlasterService.createSdk(ownerAddress, config);

    return new KlasterService(sdk);
  }

  async buildTx (txs: RawTransactionConfig[]): Promise<QuoteResponse[]> {
    const sourceChainId = txs[0].chainId;
    const _txs = splitTransactionsBatches(txs);
    const txBatch = _txs.map((_txBatch) => createBatch(_txBatch.chainId, _txBatch.txs));

    const iTx = buildItx({
      steps: txBatch,
      feeTx: this.sdk.encodePaymentFee(sourceChainId, 'USDC')
    });

    const quote = await this.sdk.getQuote(iTx);

    console.debug(quote);

    return [quote];
  }
}
