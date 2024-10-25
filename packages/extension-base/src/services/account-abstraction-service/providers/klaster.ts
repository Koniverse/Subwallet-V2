// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainInfo } from '@subwallet/chain-list/types';
import { _getEvmChainId } from '@subwallet/extension-base/services/chain-service/utils';
import { AAProviderConfig } from '@subwallet/extension-base/types';
import { initKlaster, klasterNodeHost, loadBicoV2Account } from 'klaster-sdk';

export class KlasterService {
  static chainTestnetMap: Record<number, boolean> = {};

  static async getSmartAccount (ownerAddress: string, config: AAProviderConfig): Promise<string> {
    const accountInitData = (() => {
      const { name, version } = config;

      if (version === '2.0.0' && name === 'BICONOMY') {
        return loadBicoV2Account({
          owner: ownerAddress as `0x${string}`
        });
      }

      throw Error('Unsupported account abstraction provider');
    })();

    const klasterSdk = await initKlaster({
      accountInitData,
      nodeUrl: klasterNodeHost.default
    });

    return klasterSdk.account.getAddress(1) as string;
  }

  static updateChainMap (chainInfo: _ChainInfo) {
    const chainId = _getEvmChainId(chainInfo) as number;

    if (chainId in KlasterService.chainTestnetMap) {
      return;
    }

    KlasterService.chainTestnetMap[chainId] = chainInfo.isTestnet;
  }
}
