// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { EOACodeEIP7702TxData } from '@ethereumjs/tx';
import { _ChainInfo } from '@subwallet/chain-list/types';
import { pimlicoApiKey } from '@subwallet/extension-base/constants';
import { _EvmApi } from '@subwallet/extension-base/services/chain-service/types';
import { _getEvmChainId } from '@subwallet/extension-base/services/chain-service/utils';
import { calculateGasFeeParams } from '@subwallet/extension-base/services/fee-service/utils';
import { ViemSignMessageFunc } from '@subwallet/extension-base/services/transaction-service/types';
import { EIP7702DelegateType, EvmFeeInfo } from '@subwallet/extension-base/types';
import keyring from '@subwallet/ui-keyring';
import { t } from 'i18next';
import { createSmartAccountClient, SmartAccountClient } from 'permissionless';
import { toKernelSmartAccount, toSafeSmartAccount } from 'permissionless/accounts';
import { createPimlicoClient } from 'permissionless/clients/pimlico';
import { Account, createPublicClient, defineChain, http } from 'viem';
import { entryPoint07Address } from 'viem/account-abstraction';
import { SignedAuthorization } from 'viem/experimental';

import { hexAddPrefix } from '@polkadot/util';
import { HexString } from '@polkadot/util/types';

export const createInitEIP7702Tx = async (chain: string, address: HexString, authorization: SignedAuthorization, data: HexString, web3Api: _EvmApi): Promise<EOACodeEIP7702TxData> => {
  const txConfig: EOACodeEIP7702TxData = {
    // @ts-ignore
    authorizationList: [authorization],
    data: data,
    to: address
  };

  let priority: EvmFeeInfo;

  try {
    [priority] = await Promise.all([
      calculateGasFeeParams(web3Api, chain)
    ]);
  } catch (e) {
    const error = e as Error;

    if (error.message.includes('transfer to non ERC721Receiver implementer')) {
      error.message = t('Unable to send. NFT not supported on recipient address');
    }

    throw error;
  }

  return {
    ...txConfig,
    maxFeePerGas: priority.maxFeePerGas ? hexAddPrefix(priority.maxFeePerGas?.toString(16)) : undefined,
    maxPriorityFeePerGas: priority.maxPriorityFeePerGas ? hexAddPrefix(priority.maxPriorityFeePerGas?.toString(16)) : undefined,
    gasLimit: 1_000_000,
    value: '0x00'
  };
};

export const mockSmartAccountClient = async (_address: string, rpc: string, chainInfo: _ChainInfo, delegateType: EIP7702DelegateType, signMessage?: ViemSignMessageFunc): Promise<SmartAccountClient> => {
  const address = _address as HexString;
  const accountPair = keyring.getPair(address);
  const publicKey: HexString = hexAddPrefix(Buffer.from(accountPair.publicKey).toString('hex'));
  const chainId = _getEvmChainId(chainInfo) || 0;

  const owner: Account = {
    address: address,
    signMessage: signMessage || (() => {
      return Promise.reject(new Error('Not implemented'));
    }),
    signTransaction: () => {
      return Promise.reject(new Error('Not implemented'));
    },
    signTypedData: () => {
      return Promise.reject(new Error('Not implemented'));
    },
    publicKey,
    source: 'keypair',
    type: 'local'
  };

  const chain = defineChain({
    id: chainId,
    name: chainInfo.name,
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: {
      default: {
        http: [rpc],
        webSocket: undefined
      }
    },
    testnet: chainInfo.isTestnet
  });

  const transport = http(rpc);

  const publicClient = createPublicClient({
    transport,
    chain
  });

  let smartAccount: Account | undefined;

  if (delegateType === EIP7702DelegateType.KERNEL_V3) {
    smartAccount = await toKernelSmartAccount({
      address: address,
      client: publicClient,
      version: '0.3.1',
      owners: [owner],
      entryPoint: {
        address: entryPoint07Address,
        version: '0.7'
      }
    });
  } else if (delegateType === EIP7702DelegateType.SAFE) {
    smartAccount = await toSafeSmartAccount({
      address: address,
      owners: [owner],
      client: publicClient,
      version: '1.4.1'
    });
  }

  if (!smartAccount) {
    throw new Error('Could not create smart account');
  }

  const pimlicoUrl = `https://api.pimlico.io/v2/${chainId}/rpc?apikey=${pimlicoApiKey}`;

  const pimlicoClient = createPimlicoClient({
    transport: http(pimlicoUrl)
  });

  return createSmartAccountClient({
    account: smartAccount,
    paymaster: pimlicoClient,
    bundlerTransport: http(pimlicoUrl),
    userOperation: {
      estimateFeesPerGas: async () => (await pimlicoClient.getUserOperationGasPrice()).fast
    }
  });
};
