// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainConnectionStatus, _SubstrateAdapterQueryArgs, _SubstrateAdapterSubscriptionArgs, _SubstrateApi, _SubstrateApiV2 } from '@subwallet/extension-base/services/chain-service/types';
import { createPromiseHandler, PromiseHandler } from '@subwallet/extension-base/utils';
import { createClient, PolkadotClient } from 'polkadot-api';
import { chainSpec } from 'polkadot-api/chains/polkadot';
import { withLogsRecorder } from 'polkadot-api/logs-provider';
import { getSmProvider } from 'polkadot-api/sm-provider';
import { start } from 'polkadot-api/smoldot';
import { BehaviorSubject } from 'rxjs';

import { AnyJson } from '@polkadot/types-codec/types/helpers';
import { dot } from '@polkadot-api/descriptors';

export class PolkadotApiWrapper implements _SubstrateApiV2 {
  private api: PolkadotClient;
  apiUrl: string;
  chainSlug: string;
  useLightClient: boolean;

  private handleApiReady: PromiseHandler<_SubstrateApi>;

  connectionStatus: _ChainConnectionStatus;

  isApiConnected = false;
  isApiConnectedSubject = new BehaviorSubject(false);
  isApiReady = false;
  isApiReadyOnce = false;

  specName = '';
  specVersion = '';
  systemChain = '';
  systemName = '';
  systemVersion = '';

  constructor (chainSlug: string, apiUrl: string) {
    this.chainSlug = chainSlug;
    this.apiUrl = apiUrl;

    // if (apiUrl.startsWith('light://')) {
    //   this.useLightClient = true;
    //   const smoldot = start();
    //
    //   smoldot.addChain({ chainSpec }).then((chain) => {
    //     this.api = createClient(
    //       getSmProvider(chain)
    //     );
    //   }).catch(console.error);
    // } else {
      // this.useLightClient = false;
      // const wsProvider = WebSocketProvider(apiUrl);
      // const provider = withLogsRecorder((line) => console.log(line), wsProvider);
      //
      // this.api = createClient(provider);
      // console.log('ok', this.api);
    // }

    this.connectionStatus = _ChainConnectionStatus.CONNECTED;
    this.handleApiReady = createPromiseHandler<_SubstrateApi>();
  }

  connect (): void {
    console.log('do nothing');
  }

  destroy (): Promise<void> {
    return Promise.resolve(undefined);
  }

  disconnect (): Promise<void> {
    return Promise.resolve(undefined);
  }

  get isReady (): Promise<_SubstrateApi> {
    return this.handleApiReady.promise;
  }

  recoverConnect (): Promise<void> {
    return Promise.resolve(undefined);
  }

  updateApiUrl (apiUrl: string): Promise<void> {
    return Promise.resolve(undefined);
  }

  async makeRpcQuery<T> ({ args, method, module, section }: _SubstrateAdapterQueryArgs): Promise<T> {
    const typedApi = this.api.getTypedApi(dot);
    const accountInfo = await typedApi.query.System.Account.getValue(
      '16JGzEsi8gcySKjpmxHVrkLTHdFHodRepEz8n244gNZpr9J'
    );

    console.log(accountInfo);

    return undefined;
  }

  subscribeDataWithMulti (params: _SubstrateAdapterSubscriptionArgs[], callback: (rs: Record<string, AnyJson[]>) => void): Subscription {
    return undefined;
  }
}
