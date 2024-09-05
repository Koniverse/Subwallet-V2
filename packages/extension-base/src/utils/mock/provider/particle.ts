// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import SafeEventEmitter from '@metamask/safe-event-emitter';
import { IEthereumProvider, JsonRpcRequest } from '@particle-network/aa';

class MockParticleProvider extends SafeEventEmitter implements IEthereumProvider {
  constructor (private chainId: number, private address: string) {
    super();
  }

  request (request: Partial<JsonRpcRequest>): Promise<any> {
    const { method } = request;

    switch (method) {
      case 'eth_chainId':
        return Promise.resolve(this.chainId);
      case 'eth_accounts':
        return Promise.resolve([this.address]);
    }

    return Promise.resolve(undefined);
  }
}

export const createMockParticleProvider = (chainId: number, address: string): IEthereumProvider => {
  return new MockParticleProvider(chainId, address);
}
