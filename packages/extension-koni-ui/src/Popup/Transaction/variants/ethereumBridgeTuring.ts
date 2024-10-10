// Copyright 2019-2022 @subwallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

export const ethereumBridgeTuring = [
  {
    inputs: [],
    name: 'AccessControlBadConfirmation',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'uint48',
        name: 'schedule',
        type: 'uint48'
      }
    ],
    name: 'AccessControlEnforcedDefaultAdminDelay',
    type: 'error'
  },
  {
    inputs: [],
    name: 'AccessControlEnforcedDefaultAdminRules',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'defaultAdmin',
        type: 'address'
      }
    ],
    name: 'AccessControlInvalidDefaultAdmin',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address'
      },
      {
        internalType: 'bytes32',
        name: 'neededRole',
        type: 'bytes32'
      }
    ],
    name: 'AccessControlUnauthorizedAccount',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'target',
        type: 'address'
      }
    ],
    name: 'AddressEmptyCode',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address'
      }
    ],
    name: 'AddressInsufficientBalance',
    type: 'error'
  },
  {
    inputs: [],
    name: 'AlreadyBridged',
    type: 'error'
  },
  {
    inputs: [],
    name: 'ArrayLengthMismatch',
    type: 'error'
  },
  {
    inputs: [],
    name: 'BlobRootEmpty',
    type: 'error'
  },
  {
    inputs: [],
    name: 'BridgeRootEmpty',
    type: 'error'
  },
  {
    inputs: [],
    name: 'DataRootCommitmentEmpty',
    type: 'error'
  },
  {
    inputs: [],
    name: 'EnforcedPause',
    type: 'error'
  },
  {
    inputs: [],
    name: 'ExpectedPause',
    type: 'error'
  },
  {
    inputs: [],
    name: 'FailedInnerCall',
    type: 'error'
  },
  {
    inputs: [],
    name: 'FeeTooLow',
    type: 'error'
  },
  {
    inputs: [],
    name: 'InvalidAssetId',
    type: 'error'
  },
  {
    inputs: [],
    name: 'InvalidDataLength',
    type: 'error'
  },
  {
    inputs: [],
    name: 'InvalidDataRootProof',
    type: 'error'
  },
  {
    inputs: [],
    name: 'InvalidDestinationOrAmount',
    type: 'error'
  },
  {
    inputs: [],
    name: 'InvalidDomain',
    type: 'error'
  },
  {
    inputs: [],
    name: 'InvalidFungibleTokenTransfer',
    type: 'error'
  },
  {
    inputs: [],
    name: 'InvalidInitialization',
    type: 'error'
  },
  {
    inputs: [],
    name: 'InvalidLeaf',
    type: 'error'
  },
  {
    inputs: [],
    name: 'InvalidMerkleProof',
    type: 'error'
  },
  {
    inputs: [],
    name: 'InvalidMessage',
    type: 'error'
  },
  {
    inputs: [],
    name: 'NotInitializing',
    type: 'error'
  },
  {
    inputs: [],
    name: 'ReentrancyGuardReentrantCall',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'uint8',
        name: 'bits',
        type: 'uint8'
      },
      {
        internalType: 'uint256',
        name: 'value',
        type: 'uint256'
      }
    ],
    name: 'SafeCastOverflowedUintDowncast',
    type: 'error'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'token',
        type: 'address'
      }
    ],
    name: 'SafeERC20FailedOperation',
    type: 'error'
  },
  {
    inputs: [],
    name: 'UnlockFailed',
    type: 'error'
  },
  {
    inputs: [],
    name: 'WithdrawFailed',
    type: 'error'
  },
  {
    anonymous: false,
    inputs: [],
    name: 'DefaultAdminDelayChangeCanceled',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint48',
        name: 'newDelay',
        type: 'uint48'
      },
      {
        indexed: false,
        internalType: 'uint48',
        name: 'effectSchedule',
        type: 'uint48'
      }
    ],
    name: 'DefaultAdminDelayChangeScheduled',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [],
    name: 'DefaultAdminTransferCanceled',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'newAdmin',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint48',
        name: 'acceptSchedule',
        type: 'uint48'
      }
    ],
    name: 'DefaultAdminTransferScheduled',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint64',
        name: 'version',
        type: 'uint64'
      }
    ],
    name: 'Initialized',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'from',
        type: 'bytes32'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'to',
        type: 'address'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'messageId',
        type: 'uint256'
      }
    ],
    name: 'MessageReceived',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'from',
        type: 'address'
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'to',
        type: 'bytes32'
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'messageId',
        type: 'uint256'
      }
    ],
    name: 'MessageSent',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'account',
        type: 'address'
      }
    ],
    name: 'Paused',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32'
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'previousAdminRole',
        type: 'bytes32'
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'newAdminRole',
        type: 'bytes32'
      }
    ],
    name: 'RoleAdminChanged',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'account',
        type: 'address'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'sender',
        type: 'address'
      }
    ],
    name: 'RoleGranted',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'account',
        type: 'address'
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'sender',
        type: 'address'
      }
    ],
    name: 'RoleRevoked',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'account',
        type: 'address'
      }
    ],
    name: 'Unpaused',
    type: 'event'
  },
  {
    inputs: [],
    name: 'DEFAULT_ADMIN_ROLE',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'acceptDefaultAdminTransfer',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'avail',
    outputs: [
      {
        internalType: 'contract IAvail',
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
        internalType: 'address',
        name: 'newAdmin',
        type: 'address'
      }
    ],
    name: 'beginDefaultAdminTransfer',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'cancelDefaultAdminTransfer',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'uint48',
        name: 'newDelay',
        type: 'uint48'
      }
    ],
    name: 'changeDefaultAdminDelay',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'defaultAdmin',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'defaultAdminDelay',
    outputs: [
      {
        internalType: 'uint48',
        name: '',
        type: 'uint48'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'defaultAdminDelayIncreaseWait',
    outputs: [
      {
        internalType: 'uint48',
        name: '',
        type: 'uint48'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'feePerByte',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'feeRecipient',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'fees',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'length',
        type: 'uint256'
      }
    ],
    name: 'getFee',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32'
      }
    ],
    name: 'getRoleAdmin',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32'
      },
      {
        internalType: 'address',
        name: 'account',
        type: 'address'
      }
    ],
    name: 'grantRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32'
      },
      {
        internalType: 'address',
        name: 'account',
        type: 'address'
      }
    ],
    name: 'hasRole',
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
        name: 'newFeePerByte',
        type: 'uint256'
      },
      {
        internalType: 'address',
        name: 'newFeeRecipient',
        type: 'address'
      },
      {
        internalType: 'contract IAvail',
        name: 'newAvail',
        type: 'address'
      },
      {
        internalType: 'address',
        name: 'governance',
        type: 'address'
      },
      {
        internalType: 'address',
        name: 'pauser',
        type: 'address'
      },
      {
        internalType: 'contract IVectorx',
        name: 'newVectorx',
        type: 'address'
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
        internalType: 'bytes32',
        name: '',
        type: 'bytes32'
      }
    ],
    name: 'isBridged',
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
        name: '',
        type: 'uint256'
      }
    ],
    name: 'isSent',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'messageId',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'paused',
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
    inputs: [],
    name: 'pendingDefaultAdmin',
    outputs: [
      {
        internalType: 'address',
        name: 'newAdmin',
        type: 'address'
      },
      {
        internalType: 'uint48',
        name: 'schedule',
        type: 'uint48'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'pendingDefaultAdminDelay',
    outputs: [
      {
        internalType: 'uint48',
        name: 'newDelay',
        type: 'uint48'
      },
      {
        internalType: 'uint48',
        name: 'schedule',
        type: 'uint48'
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
            internalType: 'bytes1',
            name: 'messageType',
            type: 'bytes1'
          },
          {
            internalType: 'bytes32',
            name: 'from',
            type: 'bytes32'
          },
          {
            internalType: 'bytes32',
            name: 'to',
            type: 'bytes32'
          },
          {
            internalType: 'uint32',
            name: 'originDomain',
            type: 'uint32'
          },
          {
            internalType: 'uint32',
            name: 'destinationDomain',
            type: 'uint32'
          },
          {
            internalType: 'bytes',
            name: 'data',
            type: 'bytes'
          },
          {
            internalType: 'uint64',
            name: 'messageId',
            type: 'uint64'
          }
        ],
        internalType: 'struct IAvailBridge.Message',
        name: 'message',
        type: 'tuple'
      },
      {
        components: [
          {
            internalType: 'bytes32[]',
            name: 'dataRootProof',
            type: 'bytes32[]'
          },
          {
            internalType: 'bytes32[]',
            name: 'leafProof',
            type: 'bytes32[]'
          },
          {
            internalType: 'bytes32',
            name: 'rangeHash',
            type: 'bytes32'
          },
          {
            internalType: 'uint256',
            name: 'dataRootIndex',
            type: 'uint256'
          },
          {
            internalType: 'bytes32',
            name: 'blobRoot',
            type: 'bytes32'
          },
          {
            internalType: 'bytes32',
            name: 'bridgeRoot',
            type: 'bytes32'
          },
          {
            internalType: 'bytes32',
            name: 'leaf',
            type: 'bytes32'
          },
          {
            internalType: 'uint256',
            name: 'leafIndex',
            type: 'uint256'
          }
        ],
        internalType: 'struct IAvailBridge.MerkleProofInput',
        name: 'input',
        type: 'tuple'
      }
    ],
    name: 'receiveAVAIL',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'bytes1',
            name: 'messageType',
            type: 'bytes1'
          },
          {
            internalType: 'bytes32',
            name: 'from',
            type: 'bytes32'
          },
          {
            internalType: 'bytes32',
            name: 'to',
            type: 'bytes32'
          },
          {
            internalType: 'uint32',
            name: 'originDomain',
            type: 'uint32'
          },
          {
            internalType: 'uint32',
            name: 'destinationDomain',
            type: 'uint32'
          },
          {
            internalType: 'bytes',
            name: 'data',
            type: 'bytes'
          },
          {
            internalType: 'uint64',
            name: 'messageId',
            type: 'uint64'
          }
        ],
        internalType: 'struct IAvailBridge.Message',
        name: 'message',
        type: 'tuple'
      },
      {
        components: [
          {
            internalType: 'bytes32[]',
            name: 'dataRootProof',
            type: 'bytes32[]'
          },
          {
            internalType: 'bytes32[]',
            name: 'leafProof',
            type: 'bytes32[]'
          },
          {
            internalType: 'bytes32',
            name: 'rangeHash',
            type: 'bytes32'
          },
          {
            internalType: 'uint256',
            name: 'dataRootIndex',
            type: 'uint256'
          },
          {
            internalType: 'bytes32',
            name: 'blobRoot',
            type: 'bytes32'
          },
          {
            internalType: 'bytes32',
            name: 'bridgeRoot',
            type: 'bytes32'
          },
          {
            internalType: 'bytes32',
            name: 'leaf',
            type: 'bytes32'
          },
          {
            internalType: 'uint256',
            name: 'leafIndex',
            type: 'uint256'
          }
        ],
        internalType: 'struct IAvailBridge.MerkleProofInput',
        name: 'input',
        type: 'tuple'
      }
    ],
    name: 'receiveERC20',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'bytes1',
            name: 'messageType',
            type: 'bytes1'
          },
          {
            internalType: 'bytes32',
            name: 'from',
            type: 'bytes32'
          },
          {
            internalType: 'bytes32',
            name: 'to',
            type: 'bytes32'
          },
          {
            internalType: 'uint32',
            name: 'originDomain',
            type: 'uint32'
          },
          {
            internalType: 'uint32',
            name: 'destinationDomain',
            type: 'uint32'
          },
          {
            internalType: 'bytes',
            name: 'data',
            type: 'bytes'
          },
          {
            internalType: 'uint64',
            name: 'messageId',
            type: 'uint64'
          }
        ],
        internalType: 'struct IAvailBridge.Message',
        name: 'message',
        type: 'tuple'
      },
      {
        components: [
          {
            internalType: 'bytes32[]',
            name: 'dataRootProof',
            type: 'bytes32[]'
          },
          {
            internalType: 'bytes32[]',
            name: 'leafProof',
            type: 'bytes32[]'
          },
          {
            internalType: 'bytes32',
            name: 'rangeHash',
            type: 'bytes32'
          },
          {
            internalType: 'uint256',
            name: 'dataRootIndex',
            type: 'uint256'
          },
          {
            internalType: 'bytes32',
            name: 'blobRoot',
            type: 'bytes32'
          },
          {
            internalType: 'bytes32',
            name: 'bridgeRoot',
            type: 'bytes32'
          },
          {
            internalType: 'bytes32',
            name: 'leaf',
            type: 'bytes32'
          },
          {
            internalType: 'uint256',
            name: 'leafIndex',
            type: 'uint256'
          }
        ],
        internalType: 'struct IAvailBridge.MerkleProofInput',
        name: 'input',
        type: 'tuple'
      }
    ],
    name: 'receiveETH',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: 'bytes1',
            name: 'messageType',
            type: 'bytes1'
          },
          {
            internalType: 'bytes32',
            name: 'from',
            type: 'bytes32'
          },
          {
            internalType: 'bytes32',
            name: 'to',
            type: 'bytes32'
          },
          {
            internalType: 'uint32',
            name: 'originDomain',
            type: 'uint32'
          },
          {
            internalType: 'uint32',
            name: 'destinationDomain',
            type: 'uint32'
          },
          {
            internalType: 'bytes',
            name: 'data',
            type: 'bytes'
          },
          {
            internalType: 'uint64',
            name: 'messageId',
            type: 'uint64'
          }
        ],
        internalType: 'struct IAvailBridge.Message',
        name: 'message',
        type: 'tuple'
      },
      {
        components: [
          {
            internalType: 'bytes32[]',
            name: 'dataRootProof',
            type: 'bytes32[]'
          },
          {
            internalType: 'bytes32[]',
            name: 'leafProof',
            type: 'bytes32[]'
          },
          {
            internalType: 'bytes32',
            name: 'rangeHash',
            type: 'bytes32'
          },
          {
            internalType: 'uint256',
            name: 'dataRootIndex',
            type: 'uint256'
          },
          {
            internalType: 'bytes32',
            name: 'blobRoot',
            type: 'bytes32'
          },
          {
            internalType: 'bytes32',
            name: 'bridgeRoot',
            type: 'bytes32'
          },
          {
            internalType: 'bytes32',
            name: 'leaf',
            type: 'bytes32'
          },
          {
            internalType: 'uint256',
            name: 'leafIndex',
            type: 'uint256'
          }
        ],
        internalType: 'struct IAvailBridge.MerkleProofInput',
        name: 'input',
        type: 'tuple'
      }
    ],
    name: 'receiveMessage',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32'
      },
      {
        internalType: 'address',
        name: 'account',
        type: 'address'
      }
    ],
    name: 'renounceRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'role',
        type: 'bytes32'
      },
      {
        internalType: 'address',
        name: 'account',
        type: 'address'
      }
    ],
    name: 'revokeRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'rollbackDefaultAdminDelay',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'recipient',
        type: 'bytes32'
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'sendAVAIL',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'assetId',
        type: 'bytes32'
      },
      {
        internalType: 'bytes32',
        name: 'recipient',
        type: 'bytes32'
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'sendERC20',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'recipient',
        type: 'bytes32'
      }
    ],
    name: 'sendETH',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'recipient',
        type: 'bytes32'
      },
      {
        internalType: 'bytes',
        name: 'data',
        type: 'bytes'
      }
    ],
    name: 'sendMessage',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'bool',
        name: 'status',
        type: 'bool'
      }
    ],
    name: 'setPaused',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'bytes4',
        name: 'interfaceId',
        type: 'bytes4'
      }
    ],
    name: 'supportsInterface',
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
        name: '',
        type: 'bytes32'
      }
    ],
    name: 'tokens',
    outputs: [
      {
        internalType: 'address',
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
        internalType: 'uint256',
        name: 'newFeePerByte',
        type: 'uint256'
      }
    ],
    name: 'updateFeePerByte',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'newFeeRecipient',
        type: 'address'
      }
    ],
    name: 'updateFeeRecipient',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'bytes32[]',
        name: 'assetIds',
        type: 'bytes32[]'
      },
      {
        internalType: 'address[]',
        name: 'tokenAddresses',
        type: 'address[]'
      }
    ],
    name: 'updateTokens',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'contract IVectorx',
        name: 'newVectorx',
        type: 'address'
      }
    ],
    name: 'updateVectorx',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'vectorx',
    outputs: [
      {
        internalType: 'contract IVectorx',
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
        components: [
          {
            internalType: 'bytes32[]',
            name: 'dataRootProof',
            type: 'bytes32[]'
          },
          {
            internalType: 'bytes32[]',
            name: 'leafProof',
            type: 'bytes32[]'
          },
          {
            internalType: 'bytes32',
            name: 'rangeHash',
            type: 'bytes32'
          },
          {
            internalType: 'uint256',
            name: 'dataRootIndex',
            type: 'uint256'
          },
          {
            internalType: 'bytes32',
            name: 'blobRoot',
            type: 'bytes32'
          },
          {
            internalType: 'bytes32',
            name: 'bridgeRoot',
            type: 'bytes32'
          },
          {
            internalType: 'bytes32',
            name: 'leaf',
            type: 'bytes32'
          },
          {
            internalType: 'uint256',
            name: 'leafIndex',
            type: 'uint256'
          }
        ],
        internalType: 'struct IAvailBridge.MerkleProofInput',
        name: 'input',
        type: 'tuple'
      }
    ],
    name: 'verifyBlobLeaf',
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
        components: [
          {
            internalType: 'bytes32[]',
            name: 'dataRootProof',
            type: 'bytes32[]'
          },
          {
            internalType: 'bytes32[]',
            name: 'leafProof',
            type: 'bytes32[]'
          },
          {
            internalType: 'bytes32',
            name: 'rangeHash',
            type: 'bytes32'
          },
          {
            internalType: 'uint256',
            name: 'dataRootIndex',
            type: 'uint256'
          },
          {
            internalType: 'bytes32',
            name: 'blobRoot',
            type: 'bytes32'
          },
          {
            internalType: 'bytes32',
            name: 'bridgeRoot',
            type: 'bytes32'
          },
          {
            internalType: 'bytes32',
            name: 'leaf',
            type: 'bytes32'
          },
          {
            internalType: 'uint256',
            name: 'leafIndex',
            type: 'uint256'
          }
        ],
        internalType: 'struct IAvailBridge.MerkleProofInput',
        name: 'input',
        type: 'tuple'
      }
    ],
    name: 'verifyBridgeLeaf',
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
    inputs: [],
    name: 'withdrawFees',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
];
