// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { UserOpBundle } from '@particle-network/aa';
import { QuoteResponse } from 'klaster-sdk';
import { Observable, Subscribable } from 'rxjs';

enum AAAccountType {
  EOA = 'eoa',
  CONTRACT = 'contract'
}

/**
 * Chain id
 * - If negative, it means the chain id is not supported
 * - If positive, it means the chain id is supported
 * */
type ChainId = number;

interface AAAccount {
  address: string;
  provider?: string;
  chainIds: ChainId[];
  providerId: string;
  type: AAAccountType;
  owner?: string;
}

interface AAProxy {
  id: string;
  name: string;
  accounts: AAAccount[];
}

interface RawTransactionConfig {
  to: string;
  gas: number | string;
  value?: number | string;
  data?: string;
  chainId: number;
}

/**
 * Balance info of a token on an address
 * @property {string} address - Address
 * @property {string} balance - Transferable balance
 * @property {string} token.symbol - Token symbol
 * @property {string} token.address - Token address
 * @property {number} token.decimals - Token decimals
 */
export interface BalanceItem {
  address: string;
  balance: string;
  token: {
    symbol: string;
    address: string;
    decimals: number;
  };
}

type AATransactionBundle = UserOpBundle | QuoteResponse;

export interface AccountAbstractionSDK {
  /** Return a subscribable object to subscribe to the AAProxy map */
  aaProxyObservable(): Observable<Record<string, AAProxy>>;
  /** Return the AAProxy map */
  getProxy(): Promise<Record<string, AAProxy>>;
  /** Generate a new AAProxy from address */

  generateAccount(address: string): Promise<AAProxy>;

  /** Auto subscribe balance with chain and asset list from SW */
  autoSubscribeBalance(proxyId: string): Subscribable<BalanceItem>;

  /** Subscribe balance
   * @param {string} proxyId - The proxy id
   * @returns {Subscribable<number>} - The subscribable balance
   * */
  subscribeBalance(proxyId: string, ): Subscribable<BalanceItem>;

  /**
    * Generate `AATransactionBundle` from a list of `RawTransactionConfig`
    * @param {string} sender - The sender address
    * @param {RawTransactionConfig[]} txs - The list of `RawTransactionConfig`
    * @returns
    * bundles: A list of `AATransactionBundle` to sign
    *
    * - Note: `bundles` is an array because some AA provider only supports batch transaction on the same chain
  */
  createTransaction(sender: string, txs: RawTransactionConfig[]): Promise<{
    bundles: AATransactionBundle[];
    signer: string;
  }>;
}
