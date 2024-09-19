// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { DerivePathInfo } from '@subwallet/extension-base/types';
import { KeypairType } from '@subwallet/keyring/types';

import { validateDerivationPath, validateEvmDerivationPath, validateOtherSubstrateDerivationPath, validateSr25519DerivationPath, validateTonDerivationPath, validateUnifiedDerivationPath } from './validate';

interface DeriveTestCase {
  input: string;
  output: DerivePathInfo | undefined;
}

interface AutoDeriveTestCase extends DeriveTestCase {
  type?: KeypairType;
}

const evmTestCases: DeriveTestCase[] = [
  {
    input: "m/44'/60'/0'/0/0",
    output: {
      type: 'ethereum',
      suri: '//0',
      depth: 0,
      derivationPath: "m/44'/60'/0'/0/0",
      autoIndexes: [0]
    }
  },
  {
    input: "m/44'/60'/0'/0/1",
    output: {
      type: 'ethereum',
      suri: '//1',
      depth: 1,
      derivationPath: "m/44'/60'/0'/0/1",
      autoIndexes: [1]
    }
  },
  {
    input: "m/44'/60'/0'/0/1/2",
    output: {
      type: 'ethereum',
      suri: '//1//2',
      depth: 2,
      derivationPath: "m/44'/60'/0'/0/1/2",
      autoIndexes: [1, 2]
    }
  },
  {
    input: "m/44'/60'/0'/0/1/2/3",
    output: undefined
  }
];
const tonTestCases: DeriveTestCase[] = [
  {
    input: "m/44'/607'/0'",
    output: {
      type: 'ton',
      suri: '//0',
      depth: 0,
      derivationPath: "m/44'/607'/0'",
      autoIndexes: [0]
    }
  },
  {
    input: "m/44'/607'/1'",
    output: {
      type: 'ton',
      suri: '//1',
      depth: 1,
      derivationPath: "m/44'/607'/1'",
      autoIndexes: [1]
    }
  },
  {
    input: "m/44'/607'/12'",
    output: {
      type: 'ton',
      suri: '//12',
      depth: 1,
      derivationPath: "m/44'/607'/12'",
      autoIndexes: [12]
    }
  },
  {
    input: "m/44'/607'/1'/2'",
    output: {
      type: 'ton',
      suri: '//1//2',
      depth: 2,
      derivationPath: "m/44'/607'/1'/2'",
      autoIndexes: [1, 2]
    }
  },
  {
    input: "m/44'/607'/1",
    output: undefined
  },
  {
    input: "m/44'/607'/1'/2'/3'",
    output: undefined
  }
];
const sr25519TestCases: DeriveTestCase[] = [
  {
    input: '//1',
    output: {
      type: 'sr25519',
      suri: '//1',
      depth: 1,
      autoIndexes: [1]
    }
  },
  {
    input: '//1//2',
    output: {
      type: 'sr25519',
      suri: '//1//2',
      depth: 2,
      autoIndexes: [1, 2]
    }
  },
  {
    input: '//1//2//3',
    output: {
      type: 'sr25519',
      suri: '//1//2//3',
      depth: 3,
      autoIndexes: [1, 2, 3]
    }
  },
  {
    input: '/1//2/3',
    output: {
      type: 'sr25519',
      suri: '/1//2/3',
      depth: 3,
      autoIndexes: [undefined, 2, undefined]
    }
  },
  {
    input: '/avvas//ggaa/asxxvzxv',
    output: {
      type: 'sr25519',
      suri: '/avvas//ggaa/asxxvzxv',
      depth: 3,
      autoIndexes: [undefined, undefined, undefined]
    }
  },
  {
    input: '1//2/3',
    output: undefined
  },
  {
    input: '/1//2/3/',
    output: undefined
  },
  {
    input: '//1///2//3',
    output: undefined
  }
];
const ed25519TestCases: DeriveTestCase[] = [
  {
    input: '//1',
    output: {
      type: 'ed25519',
      suri: '//1',
      depth: 1,
      autoIndexes: [1]
    }
  },
  {
    input: '//1//2',
    output: {
      type: 'ed25519',
      suri: '//1//2',
      depth: 2,
      autoIndexes: [1, 2]
    }
  },
  {
    input: '//1//2//3',
    output: {
      type: 'ed25519',
      suri: '//1//2//3',
      depth: 3,
      autoIndexes: [1, 2, 3]
    }
  },
  {
    input: '/1//2/3',
    output: undefined
  },
  {
    input: '1//2/3',
    output: undefined
  },
  {
    input: '/1//2/3/',
    output: undefined
  },
  {
    input: '//1///2//3',
    output: undefined
  }
];
const unifiedTestCases: DeriveTestCase[] = [
  {
    input: '//1',
    output: {
      type: 'unified',
      suri: '//1',
      depth: 1,
      autoIndexes: [1]
    }
  },
  {
    input: '//1//2',
    output: {
      type: 'unified',
      suri: '//1//2',
      depth: 2,
      autoIndexes: [1, 2]
    }
  },
  {
    input: '//1//2//3',
    output: undefined
  },
  {
    input: "m/44'/607'/0'",
    output: undefined
  }
];
const autoTestCases: AutoDeriveTestCase[] = [
  {
    input: "m/44'/60'/0'/0/0",
    output: {
      type: 'ethereum',
      suri: '//0',
      depth: 0,
      derivationPath: "m/44'/60'/0'/0/0",
      autoIndexes: [0]
    }
  },
  {
    input: "m/44'/60'/0'/0/1",
    type: 'ton',
    output: undefined
  },
  {
    input: "m/44'/607'/0'",
    type: 'ton',
    output: {
      type: 'ton',
      suri: '//0',
      depth: 0,
      derivationPath: "m/44'/607'/0'",
      autoIndexes: [0]
    }
  },
  {
    input: "m/44'/607'/0'",
    type: 'ethereum',
    output: undefined
  },
  {
    input: "m/44'/607'/0'",
    output: {
      type: 'ton',
      suri: '//0',
      depth: 0,
      derivationPath: "m/44'/607'/0'",
      autoIndexes: [0]
    }
  },
  {
    input: "m/44'/607'/0'",
    type: 'sr25519',
    output: undefined
  },
  {
    input: "m/44'/607'/0'",
    type: 'ed25519',
    output: undefined
  },
  {
    input: '//0',
    output: {
      autoIndexes: [0],
      depth: 1,
      suri: '//0',
      type: 'sr25519'
    }
  },
  {
    input: '//1',
    output: {
      type: 'unified',
      suri: '//1',
      depth: 1,
      autoIndexes: [1]
    }
  },
  {
    input: '//1',
    type: 'ton',
    output: undefined
  },
  {
    input: '//1',
    type: 'ethereum',
    output: undefined
  },
  {
    input: '//1',
    type: 'sr25519',
    output: {
      type: 'sr25519',
      suri: '//1',
      depth: 1,
      autoIndexes: [1]
    }
  },
  {
    input: '//1',
    type: 'ed25519',
    output: {
      type: 'ed25519',
      suri: '//1',
      depth: 1,
      autoIndexes: [1]
    }
  },
  {
    input: '//1',
    output: {
      type: 'unified',
      suri: '//1',
      depth: 1,
      autoIndexes: [1]
    }
  },
  {
    input: "m/44'/0'/0'/0/0",
    type: 'bittest-44',
    output: undefined
  }
];

describe('validate derive path', () => {
  describe('evm', () => {
    test.each(evmTestCases)('validateEvmDerivationPath $input', ({ input, output }) => {
      expect(validateEvmDerivationPath(input)).toEqual(output);
    });
  });

  describe('ton', () => {
    test.each(tonTestCases)('validateTonDerivationPath $input', ({ input, output }) => {
      expect(validateTonDerivationPath(input)).toEqual(output);
    });
  });

  describe('sr25519', () => {
    test.each(sr25519TestCases)('validateSr25519DerivationPath $input', ({ input, output }) => {
      expect(validateSr25519DerivationPath(input)).toEqual(output);
    });
  });

  describe('ed25519', () => {
    test.each(ed25519TestCases)('validateSr25519DerivationPath $input', ({ input, output }) => {
      expect(validateOtherSubstrateDerivationPath(input, 'ed25519')).toEqual(output);
    });
  });

  describe('unified', () => {
    test.each(unifiedTestCases)('validateUnifiedDerivationPath $input', ({ input, output }) => {
      expect(validateUnifiedDerivationPath(input)).toEqual(output);
    });
  });

  describe('auto', () => {
    test.each(autoTestCases)('validateDerivationPath $input $type', ({ input, output, type }) => {
      expect(validateDerivationPath(input, type)).toEqual(output);
    });
  });
});
