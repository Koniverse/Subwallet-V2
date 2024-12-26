// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainInfo } from '@subwallet/chain-list/types';
import { NetworkJson } from '@subwallet/extension-base/background/KoniTypes';
import { AccountAuthType } from '@subwallet/extension-base/background/types';
import { ALL_ACCOUNT_KEY } from '@subwallet/extension-base/constants';
import { _getChainSubstrateAddressPrefix, _isChainEvmCompatible } from '@subwallet/extension-base/services/chain-service/utils';
import { AbstractAddressJson, AccountChainType, AccountJson, AccountProxy, AccountProxyType } from '@subwallet/extension-base/types';
import { isAccountAll, reformatAddress, uniqueStringArray } from '@subwallet/extension-base/utils';
import { DEFAULT_ACCOUNT_TYPES, EVM_ACCOUNT_TYPE, SUBSTRATE_ACCOUNT_TYPE, TON_ACCOUNT_TYPE } from '@subwallet/extension-koni-ui/constants';
import { MODE_CAN_SIGN } from '@subwallet/extension-koni-ui/constants/signing';
import { AccountAddressType, AccountSignMode, AccountType } from '@subwallet/extension-koni-ui/types';
import { getNetworkKeyByGenesisHash } from '@subwallet/extension-koni-ui/utils/chain/getNetworkJsonByGenesisHash';
import { AccountInfoByNetwork } from '@subwallet/extension-koni-ui/utils/types';
import { isAddress, isSubstrateAddress, isTonAddress } from '@subwallet/keyring';
import { KeypairType } from '@subwallet/keyring/types';
import { Web3LogoMap } from '@subwallet/react-ui/es/config-provider/context';

import { decodeAddress, encodeAddress, isEthereumAddress } from '@polkadot/util-crypto';

import { isChainInfoAccordantAccountChainType } from '../chain';
import { getLogoByNetworkKey } from '../common';

export function getAccountType (address: string): AccountType {
  return isAccountAll(address) ? 'ALL' : isEthereumAddress(address) ? 'ETHEREUM' : 'SUBSTRATE';
}

export const getAccountInfoByNetwork = (networkMap: Record<string, NetworkJson>, address: string, network: NetworkJson): AccountInfoByNetwork => {
  const networkKey = getNetworkKeyByGenesisHash(networkMap, network.genesisHash) || '';

  return {
    address,
    key: networkKey,
    networkKey,
    networkDisplayName: network.chain,
    networkPrefix: network.ss58Format,
    networkLogo: getLogoByNetworkKey(networkKey),
    networkIconTheme: network.isEthereum ? 'ethereum' : (network.icon || 'polkadot'),
    formattedAddress: reformatAddress(address, network.ss58Format, network.isEthereum)
  };
};

// todo: recheck this function with current account
export const findAccountByAddress = (accounts: AccountJson[], address?: string): AccountJson | null => {
  try {
    const isAllAccount = address && isAccountAll(address);

    if (!isAddress(address) && !isAllAccount) {
      return null;
    }

    const originAddress = isAccountAll(address) ? address : reformatAddress(address);
    const result = accounts.find((account) => account.address.toLowerCase() === originAddress.toLowerCase());

    return result || null;
  } catch (e) {
    console.error('Fail to detect address', e);

    return null;
  }
};

export const getSignMode = (account: AccountJson | null | undefined): AccountSignMode => {
  if (!account) {
    return AccountSignMode.UNKNOWN;
  } else {
    return account.signMode;
  }
};

export const accountCanSign = (signMode: AccountSignMode): boolean => {
  return MODE_CAN_SIGN.includes(signMode);
};

export const filterNotReadOnlyAccount = (accounts: AccountJson[]): AccountJson[] => {
  return accounts.filter((acc) => !acc.isReadOnly);
};

export const isNoAccount = (accounts: AccountJson[] | null): boolean => {
  return accounts ? !accounts.filter((acc) => acc.address !== ALL_ACCOUNT_KEY).length : false;
};

export const searchAccountFunction = (item: AbstractAddressJson, searchText: string): boolean => {
  return item.address.toLowerCase().includes(searchText.toLowerCase()) || (item.name || '').toLowerCase().includes(searchText.toLowerCase());
};

export const searchAccountProxyFunction = (item: AccountProxy, searchText: string): boolean => {
  return (item.name || '').toLowerCase().includes(searchText.toLowerCase());
};

export const formatAccountAddress = (account: AccountJson, networkInfo: _ChainInfo | null): string => {
  const prefix = networkInfo && _getChainSubstrateAddressPrefix(networkInfo) !== -1 ? _getChainSubstrateAddressPrefix(networkInfo) : 42;
  const isEthereum = account.type === 'ethereum' || (!!networkInfo && _isChainEvmCompatible(networkInfo));

  return reformatAddress(account.address, prefix, isEthereum);
};

export const getAccountAddressType = (address?: string): AccountAddressType => {
  if (!address) {
    return AccountAddressType.UNKNOWN;
  }

  if (address === ALL_ACCOUNT_KEY) {
    return AccountAddressType.ALL;
  }

  if (isEthereumAddress(address)) {
    return AccountAddressType.ETHEREUM;
  }

  try {
    decodeAddress(address);

    return AccountAddressType.SUBSTRATE;
  } catch (e) {
    return AccountAddressType.UNKNOWN;
  }
};

export const funcSortByName = (a: AbstractAddressJson, b: AbstractAddressJson) => {
  if (isAccountAll(b.address)) {
    return 3;
  }

  return ((a?.name || '').toLowerCase() > (b?.name || '').toLowerCase()) ? 1 : -1;
};

export const findContactByAddress = (contacts: AbstractAddressJson[], address?: string): AbstractAddressJson | null => {
  try {
    const isAllAccount = address && isAccountAll(address);

    if (!isAddress(address) && !isAllAccount) {
      return null;
    }

    const originAddress = isAccountAll(address) ? address : isEthereumAddress(address) ? address : encodeAddress(decodeAddress(address));
    const result = contacts.find((contact) => contact.address.toLowerCase() === originAddress.toLowerCase());

    return result || null;
  } catch (e) {
    console.error('Fail to detect address', e);

    return null;
  }
};

export const convertKeyTypes = (authTypes: AccountAuthType[]): KeypairType[] => {
  const result: KeypairType[] = [];

  for (const authType of authTypes) {
    if (authType === 'evm') {
      result.push(EVM_ACCOUNT_TYPE);
    } else if (authType === 'substrate') {
      result.push(SUBSTRATE_ACCOUNT_TYPE);
    } else if (authType === 'ton') {
      result.push(TON_ACCOUNT_TYPE);
    }
  }

  const _rs = uniqueStringArray(result) as KeypairType[];

  return _rs.length ? _rs : DEFAULT_ACCOUNT_TYPES;
};

// todo:
//  - support bitcoin
export function getReformatedAddressRelatedToChain (accountJson: AccountJson, chainInfo: _ChainInfo): string | undefined {
  if (accountJson.specialChain && accountJson.specialChain !== chainInfo.slug) {
    return undefined;
  }

  if (!isChainInfoAccordantAccountChainType(chainInfo, accountJson.chainType)) {
    return undefined;
  }

  if (accountJson.chainType === AccountChainType.SUBSTRATE && chainInfo.substrateInfo) {
    return reformatAddress(accountJson.address, chainInfo.substrateInfo.addressPrefix);
  } else if (accountJson.chainType === AccountChainType.ETHEREUM && chainInfo.evmInfo) {
    return accountJson.address;
  } else if (accountJson.chainType === AccountChainType.TON && chainInfo.tonInfo) {
    return reformatAddress(accountJson.address, chainInfo.isTestnet ? 0 : 1);
  } else if (accountJson.chainType === AccountChainType.CARDANO && chainInfo.cardanoInfo) {
    return reformatAddress(accountJson.address, chainInfo.isTestnet ? 0 : 1);
  }

  return undefined;
}

type LedgerMustCheckType = 'polkadot' | 'migration' | 'unnecessary'

export const ledgerMustCheckNetwork = (account: AccountJson | null | undefined): LedgerMustCheckType => {
  if (account && account.isHardware && account.isGeneric && !isEthereumAddress(account.address)) {
    return account.originGenesisHash ? 'migration' : 'polkadot';
  } else {
    return 'unnecessary';
  }
};

export const ledgerGenericAccountProblemCheck = (accountProxy: AccountProxy | null | undefined): LedgerMustCheckType => {
  if (accountProxy && accountProxy.accountType === AccountProxyType.LEDGER && accountProxy.chainTypes.includes(AccountChainType.SUBSTRATE) && !accountProxy.specialChain) {
    return ledgerMustCheckNetwork(accountProxy.accounts[0]);
  } else {
    return 'unnecessary';
  }
};

export const isAddressAllowedWithAuthType = (address: string, authAccountTypes?: AccountAuthType[]) => {
  if (isEthereumAddress(address) && authAccountTypes?.includes('evm')) {
    return true;
  }

  if (isSubstrateAddress(address) && authAccountTypes?.includes('substrate')) {
    return true;
  }

  if (isTonAddress(address) && authAccountTypes?.includes('ton')) {
    return true;
  }

  return false;
};

export function getChainTypeLogoMap (logoMap: Web3LogoMap): Record<string, string> {
  return {
    [AccountChainType.SUBSTRATE]: logoMap.network.polkadot as string,
    [AccountChainType.ETHEREUM]: logoMap.network.ethereum as string,
    [AccountChainType.BITCOIN]: logoMap.network.bitcoin as string,
    [AccountChainType.TON]: logoMap.network.ton as string,
    [AccountChainType.CARDANO]: logoMap.network.cardano as string
  };
}
