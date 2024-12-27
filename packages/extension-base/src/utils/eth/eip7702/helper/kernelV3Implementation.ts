// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { Abi } from 'viem';

const abi: Abi = [
  {
    inputs: [
      {
        internalType: 'contract IEntryPoint',
        name: '_entrypoint',
        type: 'address'
      }
    ],
    stateMutability: 'nonpayable',
    type: 'constructor'
  },
  {
    inputs: [],
    name: 'EnableNotApproved',
    type: 'error'
  },
  {
    inputs: [],
    name: 'ExecutionReverted',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'idx',
        type: 'uint256'
      }
    ],
    name: 'InitConfigError',
    type: 'error'
  },
  {
    inputs: [],
    name: 'InvalidCallType',
    type: 'error'
  },
  {
    inputs: [],
    name: 'InvalidCaller',
    type: 'error'
  },
  {
    inputs: [],
    name: 'InvalidExecutor',
    type: 'error'
  },
  {
    inputs: [],
    name: 'InvalidFallback',
    type: 'error'
  },
  {
    inputs: [],
    name: 'InvalidMode',
    type: 'error'
  },
  {
    inputs: [],
    name: 'InvalidModuleType',
    type: 'error'
  },
  {
    inputs: [],
    name: 'InvalidNonce',
    type: 'error'
  },
  {
    inputs: [],
    name: 'InvalidSelector',
    type: 'error'
  },
  {
    inputs: [],
    name: 'InvalidSignature',
    type: 'error'
  },
  {
    inputs: [],
    name: 'InvalidValidationType',
    type: 'error'
  },
  {
    inputs: [],
    name: 'InvalidValidator',
    type: 'error'
  },
  {
    inputs: [],
    name: 'NonceInvalidationError',
    type: 'error'
  },
  {
    inputs: [],
    name: 'NotSupportedCallType',
    type: 'error'
  },
  {
    inputs: [],
    name: 'OnlyExecuteUserOp',
    type: 'error'
  },
  {
    inputs: [],
    name: 'PermissionDataLengthMismatch',
    type: 'error'
  },
  {
    inputs: [],
    name: 'PermissionNotAlllowedForSignature',
    type: 'error'
  },
  {
    inputs: [],
    name: 'PermissionNotAlllowedForUserOp',
    type: 'error'
  },
  {
    inputs: [],
    name: 'PolicyDataTooLarge',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'i',
        type: 'uint256'
      }
    ],
    name: 'PolicyFailed',
    type: 'error'
  },
  {
    inputs: [],
    name: 'PolicySignatureOrderError',
    type: 'error'
  },
  {
    inputs: [],
    name: 'RootValidatorCannotBeRemoved',
    type: 'error'
  },
  {
    inputs: [],
    name: 'SignerPrefixNotPresent',
    type: 'error'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint256',
        name: 'moduleTypeId',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'module',
        type: 'address'
      }
    ],
    name: 'ModuleInstalled',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'module',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'bool',
        name: 'result',
        type: 'bool'
      }
    ],
    name: 'ModuleUninstallResult',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint256',
        name: 'moduleTypeId',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'module',
        type: 'address'
      }
    ],
    name: 'ModuleUninstalled',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint32',
        name: 'nonce',
        type: 'uint32'
      }
    ],
    name: 'NonceInvalidated',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'PermissionId',
        name: 'permission',
        type: 'bytes4'
      },
      {
        indexed: false,
        internalType: 'uint32',
        name: 'nonce',
        type: 'uint32'
      }
    ],
    name: 'PermissionInstalled',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'PermissionId',
        name: 'permission',
        type: 'bytes4'
      }
    ],
    name: 'PermissionUninstalled',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'sender',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'Received',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'ValidationId',
        name: 'rootValidator',
        type: 'bytes21'
      }
    ],
    name: 'RootValidatorUpdated',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'bytes4',
        name: 'selector',
        type: 'bytes4'
      },
      {
        indexed: false,
        internalType: 'ValidationId',
        name: 'vId',
        type: 'bytes21'
      },
      {
        indexed: false,
        internalType: 'bool',
        name: 'allowed',
        type: 'bool'
      }
    ],
    name: 'SelectorSet',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint256',
        name: 'batchExecutionindex',
        type: 'uint256'
      },
      {
        indexed: false,
        internalType: 'bytes',
        name: 'result',
        type: 'bytes'
      }
    ],
    name: 'TryExecuteUnsuccessful',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'implementation',
        type: 'address'
      }
    ],
    name: 'Upgraded',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'contract IValidator',
        name: 'validator',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint32',
        name: 'nonce',
        type: 'uint32'
      }
    ],
    name: 'ValidatorInstalled',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'contract IValidator',
        name: 'validator',
        type: 'address'
      }
    ],
    name: 'ValidatorUninstalled',
    type: 'event'
  },
  {
    inputs: [],
    name: 'accountId',
    outputs: [
      {
        internalType: 'string',
        name: 'accountImplementationId',
        type: 'string'
      }
    ],
    stateMutability: 'pure',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'ValidationId',
        name: '_rootValidator',
        type: 'bytes21'
      },
      {
        internalType: 'contract IHook',
        name: 'hook',
        type: 'address'
      },
      {
        internalType: 'bytes',
        name: 'validatorData',
        type: 'bytes'
      },
      {
        internalType: 'bytes',
        name: 'hookData',
        type: 'bytes'
      }
    ],
    name: 'changeRootValidator',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'currentNonce',
    outputs: [
      {
        internalType: 'uint32',
        name: '',
        type: 'uint32'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'eip712Domain',
    outputs: [
      {
        internalType: 'bytes1',
        name: 'fields',
        type: 'bytes1'
      },
      {
        internalType: 'string',
        name: 'name',
        type: 'string'
      },
      {
        internalType: 'string',
        name: 'version',
        type: 'string'
      },
      {
        internalType: 'uint256',
        name: 'chainId',
        type: 'uint256'
      },
      {
        internalType: 'address',
        name: 'verifyingContract',
        type: 'address'
      },
      {
        internalType: 'bytes32',
        name: 'salt',
        type: 'bytes32'
      },
      {
        internalType: 'uint256[]',
        name: 'extensions',
        type: 'uint256[]'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'entrypoint',
    outputs: [
      {
        internalType: 'contract IEntryPoint',
        name: '',
        type: 'address'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'ExecMode',
        name: 'execMode',
        type: 'bytes32'
      },
      {
        internalType: 'bytes',
        name: 'executionCalldata',
        type: 'bytes'
      }
    ],
    name: 'execute',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'ExecMode',
        name: 'execMode',
        type: 'bytes32'
      },
      {
        internalType: 'bytes',
        name: 'executionCalldata',
        type: 'bytes'
      }
    ],
    name: 'executeFromExecutor',
    outputs: [
      {
        internalType: 'bytes[]',
        name: 'returnData',
        type: 'bytes[]'
      }
    ],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'sender',
            type: 'address'
          },
          {
            internalType: 'uint256',
            name: 'nonce',
            type: 'uint256'
          },
          {
            internalType: 'bytes',
            name: 'initCode',
            type: 'bytes'
          },
          {
            internalType: 'bytes',
            name: 'callData',
            type: 'bytes'
          },
          {
            internalType: 'bytes32',
            name: 'accountGasLimits',
            type: 'bytes32'
          },
          {
            internalType: 'uint256',
            name: 'preVerificationGas',
            type: 'uint256'
          },
          {
            internalType: 'bytes32',
            name: 'gasFees',
            type: 'bytes32'
          },
          {
            internalType: 'bytes',
            name: 'paymasterAndData',
            type: 'bytes'
          },
          {
            internalType: 'bytes',
            name: 'signature',
            type: 'bytes'
          }
        ],
        internalType: 'struct PackedUserOperation',
        name: 'userOp',
        type: 'tuple'
      },
      {
        internalType: 'bytes32',
        name: 'userOpHash',
        type: 'bytes32'
      }
    ],
    name: 'executeUserOp',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'ValidationId',
        name: '_rootValidator',
        type: 'bytes21'
      },
      {
        internalType: 'contract IHook',
        name: 'hook',
        type: 'address'
      },
      {
        internalType: 'bytes',
        name: 'validatorData',
        type: 'bytes'
      },
      {
        internalType: 'bytes',
        name: 'hookData',
        type: 'bytes'
      },
      {
        internalType: 'bytes[]',
        name: 'initConfig',
        type: 'bytes[]'
      }
    ],
    name: 'initialize',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'moduleType',
        type: 'uint256'
      },
      {
        internalType: 'address',
        name: 'module',
        type: 'address'
      },
      {
        internalType: 'bytes',
        name: 'initData',
        type: 'bytes'
      }
    ],
    name: 'installModule',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'ValidationId[]',
        name: 'vIds',
        type: 'bytes21[]'
      },
      {
        components: [
          {
            internalType: 'uint32',
            name: 'nonce',
            type: 'uint32'
          },
          {
            internalType: 'contract IHook',
            name: 'hook',
            type: 'address'
          }
        ],
        internalType: 'struct ValidationManager.ValidationConfig[]',
        name: 'configs',
        type: 'tuple[]'
      },
      {
        internalType: 'bytes[]',
        name: 'validationData',
        type: 'bytes[]'
      },
      {
        internalType: 'bytes[]',
        name: 'hookData',
        type: 'bytes[]'
      }
    ],
    name: 'installValidations',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'uint32',
        name: 'nonce',
        type: 'uint32'
      }
    ],
    name: 'invalidateNonce',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'ValidationId',
        name: 'vId',
        type: 'bytes21'
      },
      {
        internalType: 'bytes4',
        name: 'selector',
        type: 'bytes4'
      }
    ],
    name: 'isAllowedSelector',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'moduleType',
        type: 'uint256'
      },
      {
        internalType: 'address',
        name: 'module',
        type: 'address'
      },
      {
        internalType: 'bytes',
        name: 'additionalContext',
        type: 'bytes'
      }
    ],
    name: 'isModuleInstalled',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'hash',
        type: 'bytes32'
      },
      {
        internalType: 'bytes',
        name: 'signature',
        type: 'bytes'
      }
    ],
    name: 'isValidSignature',
    outputs: [
      {
        internalType: 'bytes4',
        name: '',
        type: 'bytes4'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address'
      },
      {
        internalType: 'address',
        name: '',
        type: 'address'
      },
      {
        internalType: 'uint256[]',
        name: '',
        type: 'uint256[]'
      },
      {
        internalType: 'uint256[]',
        name: '',
        type: 'uint256[]'
      },
      {
        internalType: 'bytes',
        name: '',
        type: 'bytes'
      }
    ],
    name: 'onERC1155BatchReceived',
    outputs: [
      {
        internalType: 'bytes4',
        name: '',
        type: 'bytes4'
      }
    ],
    stateMutability: 'pure',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address'
      },
      {
        internalType: 'address',
        name: '',
        type: 'address'
      },
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      },
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      },
      {
        internalType: 'bytes',
        name: '',
        type: 'bytes'
      }
    ],
    name: 'onERC1155Received',
    outputs: [
      {
        internalType: 'bytes4',
        name: '',
        type: 'bytes4'
      }
    ],
    stateMutability: 'pure',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address'
      },
      {
        internalType: 'address',
        name: '',
        type: 'address'
      },
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      },
      {
        internalType: 'bytes',
        name: '',
        type: 'bytes'
      }
    ],
    name: 'onERC721Received',
    outputs: [
      {
        internalType: 'bytes4',
        name: '',
        type: 'bytes4'
      }
    ],
    stateMutability: 'pure',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'PermissionId',
        name: 'pId',
        type: 'bytes4'
      }
    ],
    name: 'permissionConfig',
    outputs: [
      {
        components: [
          {
            internalType: 'PassFlag',
            name: 'permissionFlag',
            type: 'bytes2'
          },
          {
            internalType: 'contract ISigner',
            name: 'signer',
            type: 'address'
          },
          {
            internalType: 'PolicyData[]',
            name: 'policyData',
            type: 'bytes22[]'
          }
        ],
        internalType: 'struct ValidationManager.PermissionConfig',
        name: '',
        type: 'tuple'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'rootValidator',
    outputs: [
      {
        internalType: 'ValidationId',
        name: '',
        type: 'bytes21'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'bytes4',
        name: 'selector',
        type: 'bytes4'
      }
    ],
    name: 'selectorConfig',
    outputs: [
      {
        components: [
          {
            internalType: 'contract IHook',
            name: 'hook',
            type: 'address'
          },
          {
            internalType: 'address',
            name: 'target',
            type: 'address'
          },
          {
            internalType: 'CallType',
            name: 'callType',
            type: 'bytes1'
          }
        ],
        internalType: 'struct SelectorManager.SelectorConfig',
        name: '',
        type: 'tuple'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'ExecMode',
        name: 'mode',
        type: 'bytes32'
      }
    ],
    name: 'supportsExecutionMode',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool'
      }
    ],
    stateMutability: 'pure',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'moduleTypeId',
        type: 'uint256'
      }
    ],
    name: 'supportsModule',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool'
      }
    ],
    stateMutability: 'pure',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'moduleType',
        type: 'uint256'
      },
      {
        internalType: 'address',
        name: 'module',
        type: 'address'
      },
      {
        internalType: 'bytes',
        name: 'deInitData',
        type: 'bytes'
      }
    ],
    name: 'uninstallModule',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'ValidationId',
        name: 'vId',
        type: 'bytes21'
      },
      {
        internalType: 'bytes',
        name: 'deinitData',
        type: 'bytes'
      },
      {
        internalType: 'bytes',
        name: 'hookDeinitData',
        type: 'bytes'
      }
    ],
    name: 'uninstallValidation',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_newImplementation',
        type: 'address'
      }
    ],
    name: 'upgradeTo',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'validNonceFrom',
    outputs: [
      {
        internalType: 'uint32',
        name: '',
        type: 'uint32'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'sender',
            type: 'address'
          },
          {
            internalType: 'uint256',
            name: 'nonce',
            type: 'uint256'
          },
          {
            internalType: 'bytes',
            name: 'initCode',
            type: 'bytes'
          },
          {
            internalType: 'bytes',
            name: 'callData',
            type: 'bytes'
          },
          {
            internalType: 'bytes32',
            name: 'accountGasLimits',
            type: 'bytes32'
          },
          {
            internalType: 'uint256',
            name: 'preVerificationGas',
            type: 'uint256'
          },
          {
            internalType: 'bytes32',
            name: 'gasFees',
            type: 'bytes32'
          },
          {
            internalType: 'bytes',
            name: 'paymasterAndData',
            type: 'bytes'
          },
          {
            internalType: 'bytes',
            name: 'signature',
            type: 'bytes'
          }
        ],
        internalType: 'struct PackedUserOperation',
        name: 'userOp',
        type: 'tuple'
      },
      {
        internalType: 'bytes32',
        name: 'userOpHash',
        type: 'bytes32'
      },
      {
        internalType: 'uint256',
        name: 'missingAccountFunds',
        type: 'uint256'
      }
    ],
    name: 'validateUserOp',
    outputs: [
      {
        internalType: 'ValidationData',
        name: 'validationData',
        type: 'uint256'
      }
    ],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'ValidationId',
        name: 'vId',
        type: 'bytes21'
      }
    ],
    name: 'validationConfig',
    outputs: [
      {
        components: [
          {
            internalType: 'uint32',
            name: 'nonce',
            type: 'uint32'
          },
          {
            internalType: 'contract IHook',
            name: 'hook',
            type: 'address'
          }
        ],
        internalType: 'struct ValidationManager.ValidationConfig',
        name: '',
        type: 'tuple'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    stateMutability: 'payable',
    type: 'receive'
  }
] as const;

export default abi;
