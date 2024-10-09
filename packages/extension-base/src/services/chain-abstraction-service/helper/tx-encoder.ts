// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { encodeFunctionData, Hex, parseAbi } from 'viem';
import { TransactionConfig } from 'web3-core';

export interface AcrossSuggestedFeeResp {
  totalRelayFee: {
    pct: string,
    total: string
  },
  relayerCapitalFee: {
    pct: string,
    total: string
  },
  relayerGasFee: {
    pct: string,
    total: string
  },
  lpFee: {
    pct: string,
    total: string
  },
  timestamp: string,
  isAmountTooLow: boolean,
  quoteBlock: string,
  spokePoolAddress: string,
  exclusiveRelayer: string,
  exclusivityDeadline: string,
  expectedFillTimeSec: string
}

export interface BridgeParams {
  sourceTokenContract: string;
  destinationTokenContract: string;
  sourceChainId: number;
  destinationChainId: number;
  amount: bigint;
  srcAccount: string;
  destAccount: string;
  isTestnet?: boolean;
}

const amountMap: Record<string | 'default', string> = {
  default: '1000000000',
  '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1': '10000000000000000000000',
  '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14': '100000000000000000',
  '0x4200000000000000000000000000000000000006': '100000000000000000'
};

export async function getAcrossSuggestedFee (data: BridgeParams): Promise<AcrossSuggestedFeeResp> {
  const url = (data.isTestnet ? 'https://testnet.across.to/api/suggested-fees?' : 'https://across.to/api/suggested-fees?') + new URLSearchParams({
    originChainId: data.sourceChainId.toString(),
    destinationChainId: data.destinationChainId.toString(),
    inputToken: data.sourceTokenContract,
    outputToken: data.destinationTokenContract,
    amount: amountMap[data.destinationTokenContract] || amountMap.default
  }).toString();

  console.log('url', url);

  try {
    const result = fetch(url, {
      method: 'GET'
    });

    return await result.then((res) => res.json()) as AcrossSuggestedFeeResp;
  } catch (e) {
    console.log('e', e);
    throw Error('Sent amount is too low relative to fees');
  }
}

export function encodeAcrossCallData (data: BridgeParams, fees: AcrossSuggestedFeeResp): Hex {
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const abi = parseAbi([
    'function depositV3(address depositor, address recipient, address inputToken, address outputToken, uint256 inputAmount, uint256 outputAmount, uint256 destinationChainId, address exclusiveRelayer, uint32 quoteTimestamp, uint32 fillDeadline, uint32 exclusivityDeadline, bytes calldata message) external'
  ]);
  const outputAmount = data.amount - BigInt(fees.totalRelayFee.total);
  const fillDeadline = Math.round(Date.now() / 1000) + 900;

  // const [srcAddress, destAddress] = data.account.getAddresses([data.sourceChainId, data.destinationChainId]);

  // if (!srcAddress || !destAddress) {
  //   throw Error(`Can't fetch address from multichain account for ${data.sourceChainId} or ${data.destinationChainId}`);
  // }

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return encodeFunctionData({
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    abi: abi,
    functionName: 'depositV3',
    args: [
      data.srcAccount,
      data.destAccount,
      data.sourceTokenContract,
      data.destinationTokenContract,
      data.amount,
      outputAmount > 0 ? outputAmount : 0n,
      BigInt(data.destinationChainId),
      fees.exclusiveRelayer,
      parseInt(fees.timestamp),
      fillDeadline,
      parseInt(fees.exclusivityDeadline),
      '0x'
    ]
  });
}

export async function getAcrossBridgeData (data: BridgeParams): Promise<[AcrossSuggestedFeeResp, TransactionConfig]> {
  const feeResponse = await getAcrossSuggestedFee(data);

  return [
    feeResponse,
    {
      to: feeResponse.spokePoolAddress as `0x${string}`,
      data: encodeAcrossCallData(data, feeResponse)
    } as TransactionConfig
  ];
}
