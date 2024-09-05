// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { SmartAccount } from '@particle-network/aa';
import type { SmartAccountConfig } from '@particle-network/aa/dist/types/types';
import { createMockParticleProvider } from '@subwallet/extension-base/utils/mock/provider/particle';

const config: SmartAccountConfig = {
  projectId: '80d48082-7a98-41e0-8eb5-571e2e00cc7f',
  clientKey: 'cSuNrTTMf0d2Vp3l9aaAyvGm2UzRjywnNK0duRHN',
  appId: 'ca41cf00-9bac-4980-aef5-f521925f3de7',
  aaOptions: {
    accountContracts: {  // 'BICONOMY', 'CYBERCONNECT', 'SIMPLE', 'LIGHT', 'XTERIO'
      BICONOMY: [
        {
          version: '1.0.0',
          chainIds: [1],
        },
        {
          version: '2.0.0',
          chainIds: [1],
        }
      ],
      CYBERCONNECT: [
        {
          version: '1.0.0',
          chainIds: [1],
        }
      ],
      SIMPLE: [
        {
          version: '1.0.0',
          chainIds: [1],
        }
      ],
    },
    // paymasterApiKeys: [{ // Optional
    //   chainId: 1,
    //   apiKey: 'Biconomy Paymaster API Key',
    // }]
  },
};

export class ParticleAAHandler {
  static getSmartAccount = async (ownerAddress: string): Promise<string> => {
    const provider = createMockParticleProvider(1, ownerAddress);

    const smartAccount = new SmartAccount(provider, config);

    smartAccount.setSmartAccountContract({ name: 'BICONOMY', version: '2.0.0' });

    return smartAccount.getAddress();
  }
}
