// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainInfo } from '@subwallet/chain-list/types';
import { ExtrinsicDataTypeMap, ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import { _getBlockExplorerFromChain, _isChainTestNet, _isPureEvmChain } from '@subwallet/extension-base/services/chain-service/utils';
import { CHAIN_FLIP_MAINNET_EXPLORER, CHAIN_FLIP_TESTNET_EXPLORER, SIMPLE_SWAP_EXPLORER } from '@subwallet/extension-base/services/swap-service/utils';
import { ChainflipSwapTxData, SimpleSwapTxData } from '@subwallet/extension-base/types/swap';

// @ts-ignore
export function parseTransactionData<T extends ExtrinsicType> (data: unknown): ExtrinsicDataTypeMap[T] {
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return data as ExtrinsicDataTypeMap[T];
}

function getBlockExplorerAccountRoute (explorerLink: string) {
  if (explorerLink.includes('explorer.subspace.network')) {
    return 'accounts';
  }

  if (explorerLink.includes('deeperscan.io')) {
    return 'account';
  }

  if (explorerLink.includes('subscan.io')) {
    return 'account';
  }

  if (explorerLink.includes('3dpscan.io')) {
    return 'account';
  }

  if (explorerLink.includes('explorer.polimec.org')) {
    return 'account';
  }

  if (explorerLink.includes('invarch.statescan.io')) {
    return '#/accounts';
  }

  if (explorerLink.includes('tangle.statescan.io')) {
    return '#/accounts';
  }

  if (explorerLink.includes('laos.statescan.io')) {
    return '#/accounts';
  }

  if (explorerLink.includes('explorer.zkverify.io')) {
    return 'account';
  }

  if (explorerLink.includes('astral.autonomys')) {
    return 'accounts';
  }

  return 'address';
}

function getBlockExplorerTxRoute (chainInfo: _ChainInfo) {
  if (_isPureEvmChain(chainInfo)) {
    return 'tx';
  }

  if (['aventus', 'deeper_network'].includes(chainInfo.slug)) {
    return 'transaction';
  }

  if (['invarch', 'tangle'].includes(chainInfo.slug)) {
    return '#/extrinsics';
  }

  return 'extrinsic';
}

export function getExplorerLink (chainInfo: _ChainInfo, value: string, type: 'account' | 'tx'): string | undefined {
  const explorerLink = _getBlockExplorerFromChain(chainInfo);

  if (explorerLink && type === 'account') {
    const route = getBlockExplorerAccountRoute(explorerLink);

    return `${explorerLink}${explorerLink.endsWith('/') ? '' : '/'}${route}/${value}`;
  }

  if (explorerLink && value.startsWith('0x')) {
    if (chainInfo.slug === 'bittensor') {
      return undefined;
    }

    const route = getBlockExplorerTxRoute(chainInfo);

    if (chainInfo.slug === 'tangle') {
      return (`${explorerLink}${explorerLink.endsWith('/') ? '' : '/'}extrinsic/${value}${route}/${value}`);
    }

    return (`${explorerLink}${explorerLink.endsWith('/') ? '' : '/'}${route}/${value}`);
  }

  return undefined;
}

export function getChainflipExplorerLink (data: ChainflipSwapTxData, chainInfo: _ChainInfo) {
  const chainflipDomain = _isChainTestNet(chainInfo) ? CHAIN_FLIP_TESTNET_EXPLORER : CHAIN_FLIP_MAINNET_EXPLORER;

  return `${chainflipDomain}/channels/${data.depositChannelId}`;
}

export function getSimpleSwapExplorerLink (data: SimpleSwapTxData) {
  const simpleswapDomain = SIMPLE_SWAP_EXPLORER;

  return `${simpleswapDomain}/exchange?id=${data.id}`;
}
