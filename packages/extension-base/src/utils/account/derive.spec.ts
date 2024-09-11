// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { KeypairType } from '@subwallet/keyring/types';
import { DerivePathInfo, validateDerivationPath, validateEvmDerivationPath, validateOtherSubstrateDerivationPath, validateSr25519DerivationPath, validateTonDerivationPath, validateUnifiedDerivationPath } from './derive';

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
      raw: "m/44'/60'/0'/0/0",
      type: 'ethereum',
      suri: '//0',
      depth: 0
    }
  },
  {
    input: "m/44'/60'/0'/0/1",
    output: {
      raw: "m/44'/60'/0'/0/1",
      type: 'ethereum',
      suri: '//1',
      depth: 1
    }
  },
  {
    input: "m/44'/60'/0'/0/1/2",
    output: {
      raw: "m/44'/60'/0'/0/1/2",
      type: 'ethereum',
      suri: '//1//2',
      depth: 2
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
      raw: "m/44'/607'/0'",
      type: 'ton',
      suri: '//0',
      depth: 0
    }
  },
  {
    input: "m/44'/607'/1'",
    output: {
      raw: "m/44'/607'/1'",
      type: 'ton',
      suri: '//1',
      depth: 1
    }
  },
  {
    input: "m/44'/607'/12'",
    output: {
      raw: "m/44'/607'/12'",
      type: 'ton',
      suri: '//12',
      depth: 1
    }
  },
  {
    input: "m/44'/607'/1'/2'",
    output: {
      raw: "m/44'/607'/1'/2'",
      type: 'ton',
      suri: '//1//2',
      depth: 2
    }
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
      raw: '//1',
      type: 'sr25519',
      suri: '//1',
      depth: 1
    }
  },
  {
    input: '//1//2',
    output: {
      raw: '//1//2',
      type: 'sr25519',
      suri: '//1//2',
      depth: 2
    }
  },
  {
    input: '//1//2//3',
    output: {
      raw: '//1//2//3',
      type: 'sr25519',
      suri: '//1//2//3',
      depth: 3
    }
  },
  {
    input: '/1//2/3',
    output: {
      raw: '/1//2/3',
      type: 'sr25519',
      suri: '/1//2/3',
      depth: 3
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
      raw: '//1',
      type: 'ed25519',
      suri: '//1',
      depth: 1
    }
  },
  {
    input: '//1//2',
    output: {
      raw: '//1//2',
      type: 'ed25519',
      suri: '//1//2',
      depth: 2
    }
  },
  {
    input: '//1//2//3',
    output: {
      raw: '//1//2//3',
      type: 'ed25519',
      suri: '//1//2//3',
      depth: 3
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
      raw: '//1',
      type: 'unified',
      suri: '//1',
      depth: 1
    }
  },
  {
    input: '//1//2',
    output: {
      raw: '//1//2',
      type: 'unified',
      suri: '//1//2',
      depth: 2
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
      raw: "m/44'/60'/0'/0/0",
      type: 'ethereum',
      suri: '//0',
      depth: 0
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
      raw: "m/44'/607'/0'",
      type: 'ton',
      suri: '//0',
      depth: 0
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
      raw: "m/44'/607'/0'",
      type: 'ton',
      suri: '//0',
      depth: 0
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
      raw: '//0',
      type: 'unified',
      suri: '//0',
      depth: 1
    }
  },
  {
    input: '//1',
    output: {
      raw: '//1',
      type: 'unified',
      suri: '//1',
      depth: 1
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
      raw: '//1',
      type: 'sr25519',
      suri: '//1',
      depth: 1
    }
  },
  {
    input: '//1',
    type: 'ed25519',
    output: {
      raw: '//1',
      type: 'ed25519',
      suri: '//1',
      depth: 1
    }
  },
  {
    input: '//1',
    output: {
      raw: '//1',
      type: 'unified',
      suri: '//1',
      depth: 1
    }
  },
  {
    input: "m/44'/0'/0'/0/0",
    type: 'bittest-44',
    output: undefined
  },
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
    test.each(autoTestCases)('validateDerivationPath $input $type', ({ input, type, output }) => {
      expect(validateDerivationPath(input, type)).toEqual(output);
    });
  });
});
