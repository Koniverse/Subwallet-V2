// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { BridgePluginParams } from 'klaster-sdk';
import { encodeFunctionData, Hex, parseAbi } from 'viem';

import { AcrossSuggestedFeeResp } from '../klaster';

export async function getAcrossSuggestedFee (data: BridgePluginParams): Promise<AcrossSuggestedFeeResp> {
  const url = 'https://testnet.across.to/api/suggested-fees?' + new URLSearchParams({
    originChainId: data.sourceChainId.toString(),
    destinationChainId: data.destinationChainId.toString(),
    inputToken: data.sourceToken,
    outputToken: data.destinationToken,
    amount: data.amount.toString()
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

export function encodeAcrossCallData (data: BridgePluginParams, fees: AcrossSuggestedFeeResp): Hex {
  // @ts-ignore
  const abi = parseAbi([
    'function depositV3(address depositor, address recipient, address inputToken, address outputToken, uint256 inputAmount, uint256 outputAmount, uint256 destinationChainId, address exclusiveRelayer, uint32 quoteTimestamp, uint32 fillDeadline, uint32 exclusivityDeadline, bytes calldata message) external'
  ]);
  const outputAmount = data.amount - BigInt(fees.totalRelayFee.total);
  const fillDeadline = Math.round(Date.now() / 1000) + 900;

  const [srcAddress, destAddress] = data.account.getAddresses([data.sourceChainId, data.destinationChainId]);

  if (!srcAddress || !destAddress) {
    throw Error(`Can't fetch address from multichain account for ${data.sourceChainId} or ${data.destinationChainId}`);
  }

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return encodeFunctionData({
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    abi: abi,
    functionName: 'depositV3',
    args: [
      srcAddress,
      destAddress,
      data.sourceToken,
      data.destinationToken,
      data.amount,
      outputAmount,
      BigInt(data.destinationChainId),
      fees.exclusiveRelayer,
      parseInt(fees.timestamp),
      fillDeadline,
      parseInt(fees.exclusivityDeadline),
      '0x'
    ]
  });
}
