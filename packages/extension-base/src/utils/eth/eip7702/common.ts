// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { EOACodeEIP7702TxData } from '@ethereumjs/tx';
import { _EvmApi } from '@subwallet/extension-base/services/chain-service/types';
import { calculateGasFeeParams } from '@subwallet/extension-base/services/fee-service/utils';
import { EvmFeeInfo } from '@subwallet/extension-base/types';
import { t } from 'i18next';
import { SignedAuthorization } from 'viem/experimental';

import { hexAddPrefix } from '@polkadot/util';
import { HexString } from '@polkadot/util/types';

export const createInitEIP7702Tx = async (chain: string, address: HexString, authorization: SignedAuthorization, data: HexString, web3Api: _EvmApi): Promise<EOACodeEIP7702TxData> => {
  const txConfig: EOACodeEIP7702TxData = {
    authorizationList: [authorization],
    data: '0x',
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
