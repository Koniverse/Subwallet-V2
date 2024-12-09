// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainInfo } from '@subwallet/chain-list/types';
import { _chainInfoToChainType, findChainInfoByChainId, findChainInfoByHalfGenesisHash } from '@subwallet/extension-base/services/chain-service/utils';
import { WALLET_CONNECT_EIP155_NAMESPACE, WALLET_CONNECT_POLKADOT_NAMESPACE } from '@subwallet/extension-base/services/wallet-connect-service/constants';
import { AccountProxy } from '@subwallet/extension-base/types';
import { WalletConnectChainInfo } from '@subwallet/extension-koni-ui/types';
import { SessionTypes } from '@walletconnect/types';

export const chainsToWalletConnectChainInfos = (chainMap: Record<string, _ChainInfo>, chains: string[]): Array<WalletConnectChainInfo> => {
  return chains.map((chain) => {
    const [namespace, info] = chain.split(':');

    if (namespace === WALLET_CONNECT_EIP155_NAMESPACE) {
      const chainInfo = findChainInfoByChainId(chainMap, parseInt(info));

      return {
        chainInfo,
        slug: chainInfo?.slug || chain,
        supported: !!chainInfo,
        accountType: chainInfo ? _chainInfoToChainType(chainInfo) : undefined,
        wcChain: chain
      };
    } else if (namespace === WALLET_CONNECT_POLKADOT_NAMESPACE) {
      const chainInfo = findChainInfoByHalfGenesisHash(chainMap, info);

      return {
        chainInfo,
        slug: chainInfo?.slug || chain,
        supported: !!chainInfo,
        accountType: chainInfo ? _chainInfoToChainType(chainInfo) : undefined,
        wcChain: chain
      };
    } else {
      return {
        chainInfo: null,
        slug: chain,
        supported: false,
        wcChain: chain
      };
    }
  });
};

export const getWCAccountProxyList = (accountProxies: AccountProxy[], namespaces: SessionTypes.Namespaces): AccountProxy[] => {
  const filteredList: string[] = [];
  const rawList = Object.values(namespaces).map((namespace) => namespace.accounts || []).flat();

  rawList.forEach((info) => {
    const [,, address] = info.split(':');

    if (!filteredList.includes(address)) {
      filteredList.push(address);
    }
  });

  return accountProxies.filter(({ accounts }) => {
    return accounts.some(({ address }) => filteredList.includes(address));
  });
};
