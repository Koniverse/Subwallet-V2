// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountMetadataData, DeriveInfo } from '@subwallet/extension-base/types';
import { KeypairType, KeyringPair$Meta } from '@subwallet/keyring/types';
import { keyring } from '@subwallet/ui-keyring';

import { cryptoWaitReady } from '@polkadot/util-crypto';

import { findSoloNextDerive, getSoloDerivationInfo } from './info';

interface TestCase {
  input: {
    type: KeypairType;
    metadata: AccountMetadataData;
  },
  output: DeriveInfo;
}

const testCases: TestCase[] = [
  {
    input: {
      type: 'sr25519',
      metadata: {
        suri: '//0'
      }
    },
    output: {
      suri: '//0',
      depth: 1,
      autoIndexes: [0]
    }
  },
  {
    input: {
      type: 'ethereum',
      metadata: {
        suri: '//0'
      }
    },
    output: {
      suri: '//0',
      depth: 0,
      derivationPath: "m/44'/60'/0'/0/0",
      autoIndexes: [0]
    }
  },
  {
    input: {
      type: 'ton',
      metadata: {
        suri: '//0'
      }
    },
    output: {
      suri: '//0',
      depth: 0,
      derivationPath: "m/44'/607'/0'",
      autoIndexes: [0]
    }
  },
  {
    input: {
      type: 'ton',
      metadata: {
        suri: '//1'
      }
    },
    output: {
      suri: '//1',
      depth: 1,
      derivationPath: "m/44'/607'/1'",
      autoIndexes: [1]
    }
  },
  {
    input: {
      type: 'ton',
      metadata: {
        suri: '//0//1'
      }
    },
    output: {
      suri: '//0//1',
      depth: 2,
      derivationPath: "m/44'/607'/0'/1'",
      autoIndexes: [0, 1]
    }
  },
  {
    input: {
      type: 'ton',
      metadata: {}
    },
    output: {
      depth: 0
    }
  },
  {
    input: {
      type: 'bitcoin-44',
      metadata: {
        suri: '//0'
      }
    },
    output: {
      suri: '//0',
      depth: 0,
      derivationPath: '',
      autoIndexes: [0]
    }
  },
  {
    input: {
      type: 'sr25519',
      metadata: {
        suri: '//Alice'
      }
    },
    output: {
      suri: '//Alice',
      depth: 1,
      autoIndexes: [undefined]
    }
  }
];

interface SimplePair {
  address: string;
  type: KeypairType;
  meta: AccountMetadataData;
}

const simplePairs: SimplePair[] = [
  {
    address: '5DnokDpMdNEH8cApsZoWQnjsggADXQmGWUb6q8ZhHeEwvncL',
    type: 'sr25519',
    meta: {}
  },
  {
    address: '12bzRJfh7arnnfPPUZHeJUaE62QLEwhK48QnH9LXeK2m1iZU',
    type: 'sr25519',
    meta: {}
  },
  {
    address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    type: 'sr25519',
    meta: {
      parentAddress: '5DfhGyQdFobKM8NsWvEeAKk5EQQgYe9AydgJ7rMB6E1EqRzV',
      suri: '//Alice'
    }
  },
  {
    address: '0x1bE71274859A3572AaFC45bbF430dc33F37cc80E',
    type: 'ethereum',
    meta: {
      // derivationPath: "m/44'/60'/0'/0/0",
      suri: '//0'
    }
  },
  {
    address: '0x7D362584aAC8713F336b3e9699e83EEeC5D5124e',
    type: 'ethereum',
    meta: {
      // suri: '//2',
      parentAddress: '0x1bE71274859A3572AaFC45bbF430dc33F37cc80E',
      derivationPath: "m/44'/60'/0'/0/2"
    }
  },
  {
    address: '0x7dC0fB4b7fD0571bD43FEA9863389Ed150f1C1c6',
    type: 'ethereum',
    meta: {
      suri: '//1',
      parentAddress: '0x1bE71274859A3572AaFC45bbF430dc33F37cc80E'
    }
  },
  {
    address: '0x6E8112338756E0a38Ee93853210dfB06bD7422f5',
    type: 'ethereum',
    meta: {
      suri: '//5',
      parentAddress: '0x1bE71274859A3572AaFC45bbF430dc33F37cc80E'
    }
  },
  {
    address: '0xD2CCd8dec6296486bd633dA8f3e4FdBD7D421A21',
    type: 'ethereum',
    meta: {
      suri: '//0//0',
      parentAddress: '0x1bE71274859A3572AaFC45bbF430dc33F37cc80E'
    }
  },
  {
    address: 'UQA--62uJoJNKzGD1MWnYHF8-V9jhzmI1a8jThl0I-HvtGPq',
    type: 'ton',
    meta: {}
  }
];

describe('info', () => {
  test.each(testCases)('getDerivationInfo', ({ input, output }) => {
    expect(getSoloDerivationInfo(input.type, input.metadata as KeyringPair$Meta)).toEqual(output);
  });

  describe('findNextDerivePair', () => {
    beforeAll(async () => {
      await cryptoWaitReady();

      keyring.loadAll({});

      simplePairs.forEach(({ address, meta, type }) => {
        const pair = keyring.keyring.createFromAddress(address, meta as KeyringPair$Meta, null, type);

        keyring.addPair(pair, false);
      });
    });

    test('findNextDerivePair', () => {
      console.log(findSoloNextDerive('UQA--62uJoJNKzGD1MWnYHF8-V9jhzmI1a8jThl0I-HvtGPq'));
    });
  });
});
