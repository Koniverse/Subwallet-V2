// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountContract, SmartAccount, SmartAccountConfig, Transaction, UserOp, UserOpBundle } from '@particle-network/aa';
import { SmartAccountData } from '@subwallet/extension-base/background/types';
import { anyNumberToBN } from '@subwallet/extension-base/utils';
import { createMockParticleProvider } from '@subwallet/extension-base/utils/mock/provider/particle';
import { TransactionConfig } from 'web3-core';

export const ParticleContract: AccountContract = {
  name: 'BICONOMY',
  version: '2.0.0'
};

const config: SmartAccountConfig = {
  projectId: '80d48082-7a98-41e0-8eb5-571e2e00cc7f',
  clientKey: 'cSuNrTTMf0d2Vp3l9aaAyvGm2UzRjywnNK0duRHN',
  appId: 'ca41cf00-9bac-4980-aef5-f521925f3de7',
  aaOptions: {
    accountContracts: { // 'BICONOMY', 'CYBERCONNECT', 'SIMPLE', 'LIGHT', 'XTERIO'
      BICONOMY: [
        {
          version: '1.0.0',
          chainIds: [1]
        },
        {
          version: '2.0.0',
          chainIds: [1, 11155111]
        }
      ],
      CYBERCONNECT: [
        {
          version: '1.0.0',
          chainIds: [1]
        }
      ],
      SIMPLE: [
        {
          version: '1.0.0',
          chainIds: [1]
        }
      ]
    }
    // paymasterApiKeys: [{ // Optional
    //   chainId: 1,
    //   apiKey: 'Biconomy Paymaster API Key',
    // }]
  }
};

export class ParticleAAHandler {
  static getSmartAccount = async (account: SmartAccountData): Promise<string> => {
    const provider = createMockParticleProvider(1, account.owner);

    const smartAccount = new SmartAccount(provider, config);

    smartAccount.setSmartAccountContract(account.provider || ParticleContract);

    return smartAccount.getAddress();
  };

  static createUserOperation = async (chainId: number, account: SmartAccountData, _txList: TransactionConfig[]): Promise<UserOpBundle> => {
    const provider = createMockParticleProvider(chainId, account.owner);

    const smartAccount = new SmartAccount(provider, config);

    smartAccount.setSmartAccountContract(account.provider || ParticleContract);

    const txList: Transaction[] = [];

    for (const _tx of _txList) {
      const tx: Transaction = {
        data: _tx.data,
        value: anyNumberToBN(_tx.value).toString(),
        to: _tx.to || '',
        gasLimit: _tx.gas
      };

      txList.push(tx);
    }

    console.debug('quote', await smartAccount.getFeeQuotes(txList));

    return await smartAccount.buildUserOperation({ tx: txList });
  };

  static sendSignedUserOperation = async (chainId: number, account: SmartAccountData, userOp: UserOp): Promise<string> => {
    const provider = createMockParticleProvider(chainId, account.owner);

    const smartAccount = new SmartAccount(provider, config);

    smartAccount.setSmartAccountContract(account.provider || ParticleContract);

    return await smartAccount.sendSignedUserOperation(userOp);
  };
}
