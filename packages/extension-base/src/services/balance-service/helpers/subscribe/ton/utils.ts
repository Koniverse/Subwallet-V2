// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

// import { getHttpEndpoint } from '@orbs-network/ton-access';
import { _TonApi } from '@subwallet/extension-base/services/chain-service/types';
import { Address } from '@ton/core';
import { JettonMaster, JettonWallet, OpenedContract } from '@ton/ton';

export function getJettonMasterContract (tonApi: _TonApi, contractAddress: string) {
  const masterAddress = Address.parse(contractAddress);

  return tonApi.open(JettonMaster.create(masterAddress));
}

export async function getJettonWalletContract (jettonMasterContract: OpenedContract<JettonMaster>, tonApi: _TonApi, ownerAddress: string) {
  await sleep(1500);
  const walletAddress = Address.parse(ownerAddress);

  await sleep(1500);
  const jettonWalletAddress = await jettonMasterContract.getWalletAddress(walletAddress);

  await sleep(1500);

  return tonApi.open(JettonWallet.create(jettonWalletAddress));
}

// export async function getTonClient (isTestnet = false) {
//   if (isTestnet) {
//     const endpoint = await getHttpEndpoint({ network: 'testnet' });
//
//     return new TonClient({ endpoint });
//   }
//
//   const endpoint = await getHttpEndpoint();
//
//   return new TonClient({ endpoint });
// }

export function sleep (ms: number) { // alibaba for test
  return new Promise((resolve) => setTimeout(resolve, ms));
}
