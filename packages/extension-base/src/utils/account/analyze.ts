// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainInfo } from '@subwallet/chain-list/types';
import { resolveAzeroAddressToDomain, resolveAzeroDomainToAddress } from '@subwallet/extension-base/koni/api/dotsama/domain';
import { _SubstrateApi } from '@subwallet/extension-base/services/chain-service/types';
import { _chainInfoToChainType, _getChainSubstrateAddressPrefix } from '@subwallet/extension-base/services/chain-service/utils';
import { AbstractAddressJson, AccountChainType, AccountProxy, AddressJson, AnalyzeAddress, AnalyzedGroup, ResponseInputAccountSubscribe } from '@subwallet/extension-base/types';

import { isAddress } from '@polkadot/util-crypto';

import { _reformatAddressWithChain, reformatAddress } from './common';

interface AddressDataJson extends AbstractAddressJson {
  chainType: AccountChainType;
}

type ValidDataType = 'invalid' | 'valid' | 'extracted';

// TODO: Re-confirm to compare without
const isStrValidWithAddress = (str: string, account: AddressDataJson, chainInfo: _ChainInfo): ValidDataType => {
  if (account.chainType === AccountChainType.SUBSTRATE) {
    const reformated = reformatAddress(account.address, _getChainSubstrateAddressPrefix(chainInfo));

    if (account.address.toLowerCase() === str || reformated.toLowerCase() === str) {
      return 'extracted';
    } else if (account.address.toLowerCase().includes(str) || reformated.toLowerCase().includes(str)) {
      return 'valid';
    }
  } else if (account.chainType === AccountChainType.TON || account.chainType === AccountChainType.CARDANO) { // todo: recheck for Cardano
    const isTestnet = chainInfo.isTestnet;
    const reformated = reformatAddress(account.address, isTestnet ? 0 : 1);

    if (account.address.toLowerCase() === str || reformated.toLowerCase() === str) {
      return 'extracted';
    } else if (account.address.toLowerCase().includes(str) || reformated.toLowerCase().includes(str)) {
      return 'valid';
    }
  } else {
    if (account.address.toLowerCase() === str) {
      return 'extracted';
    } else if (account.address.toLowerCase().includes(str)) {
      return 'valid';
    }
  }

  return 'invalid';
};

const isNameValid = (str: string, name: string): ValidDataType => {
  if (name === str) {
    return 'extracted';
  } else if (name.includes(str)) {
    return 'valid';
  } else {
    return 'invalid';
  }
};

export const _analyzeAddress = async (data: string, accountProxies: AccountProxy[], contacts: AddressJson[], chainInfo: _ChainInfo, substrateApi?: _SubstrateApi): Promise<Omit<ResponseInputAccountSubscribe, 'id'>> => {
  if (!data) {
    return {
      options: []
    };
  }

  const chain = chainInfo.slug;
  const _data = data.trim().toLowerCase();
  const options: AnalyzeAddress[] = [];
  const currentChainType = _chainInfoToChainType(chainInfo);
  let current: AnalyzeAddress | undefined;

  // Filter account proxies
  for (const accountProxy of accountProxies) {
    const _name = accountProxy.name.trim().toLowerCase();
    const nameCondition = isNameValid(_data, _name);
    const filterAccounts = accountProxy.accounts.filter((account) => account.chainType === currentChainType);

    for (const account of filterAccounts) {
      const addressCondition = isStrValidWithAddress(_data, account, chainInfo);
      const condition = nameCondition !== 'invalid' ? nameCondition : addressCondition;

      const rs: AnalyzeAddress = {
        address: account.address,
        proxyId: accountProxy.id,
        analyzedGroup: AnalyzedGroup.WALLET,
        displayName: accountProxy.name,
        formatedAddress: _reformatAddressWithChain(account.address, chainInfo)
      };

      if (condition !== 'invalid') {
        if (account.specialChain) {
          if (account.specialChain === chain) {
            options.push(rs);

            if (condition === 'extracted') {
              current = rs;
            }
          }
        } else {
          options.push(rs);

          if (condition === 'extracted') {
            current = rs;
          }
        }
      }
    }
  }

  const filterContacts = contacts.filter((contact) => contact.chainType === currentChainType);

  // Filter address book addresses
  for (const contact of filterContacts) {
    const name = contact?.name || '';
    const _name = name.trim().toLowerCase();
    const nameCondition = isNameValid(_data, _name);
    const addressCondition = isStrValidWithAddress(_data, contact, chainInfo);
    const condition = nameCondition !== 'invalid' ? nameCondition : addressCondition;

    const rs: AnalyzeAddress = {
      address: contact.address,
      analyzedGroup: contact.isRecent ? AnalyzedGroup.RECENT : AnalyzedGroup.CONTACT,
      displayName: name,
      formatedAddress: _reformatAddressWithChain(contact.address, chainInfo)
    };

    if (condition !== 'invalid') {
      if (contact.isRecent) {
        if (contact.recentChainSlugs?.includes(chain)) {
          options.push(rs);

          if (condition === 'extracted') {
            current = rs;
          }
        }
      } else {
        options.push(rs);

        if (condition === 'extracted') {
          current = rs;
        }
      }
    }
  }

  if (substrateApi) {
    await substrateApi?.isReady;

    const _raw = data.trim();

    if (chain === 'aleph' || chain === 'alephTest') {
      if (isAddress(_raw)) {
        const domain = await resolveAzeroAddressToDomain(_raw, chain, substrateApi.api);

        if (domain) {
          const rs: AnalyzeAddress = {
            address: _raw,
            analyzedGroup: AnalyzedGroup.DOMAIN,
            displayName: domain,
            formatedAddress: _reformatAddressWithChain(_raw, chainInfo)
          };

          options.push(rs);

          if (!current) {
            current = rs;
          }
        }
      } else {
        const address = await resolveAzeroDomainToAddress(_raw, chain, substrateApi.api);

        if (address) {
          const rs: AnalyzeAddress = {
            address: address,
            analyzedGroup: AnalyzedGroup.DOMAIN,
            displayName: _raw,
            formatedAddress: _reformatAddressWithChain(address, chainInfo)
          };

          options.push(rs);

          if (!current) {
            current = rs;
          }
        }
      }
    }
  }

  return {
    options,
    current
  };
};
