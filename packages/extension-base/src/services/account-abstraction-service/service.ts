// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AAAccount, AAAccountType, AAProvider, AAProviderConfig, AAProxy, AAServiceConfig, AAServiceConfigInit, AATransaction, RawTransactionConfig } from '@subwallet/extension-base/types';
import { createAccountProxyId } from '@subwallet/extension-base/utils/account/transform';
import { BehaviorSubject } from 'rxjs';
import { TransactionConfig } from 'web3-core';

import { getSupportedChainIds } from './constants';
import { KlasterService, ParticleService } from './providers';

const DEFAULT_CONFIG: AAServiceConfig = {
  providers: [AAProvider.KLASTER, AAProvider.PARTICLE],
  providerConfig: {
    [AAProvider.KLASTER]: {
      name: 'BICONOMY',
      version: '2.0.0'
    },
    [AAProvider.PARTICLE]: {
      name: 'BICONOMY',
      version: '2.0.0'
    }
  }
};

interface CreateTransactionResult {
  signer: string;
  transactions: AATransaction[];
}

export class AccountAbstractionService {
  private configSubject: BehaviorSubject<AAServiceConfig> = new BehaviorSubject<AAServiceConfig>(DEFAULT_CONFIG);
  private proxyToOwnerSubject: BehaviorSubject<Record<string, string>> = new BehaviorSubject<Record<string, string>>({});
  private addressToProxySubject: BehaviorSubject<Record<string, string>> = new BehaviorSubject<Record<string, string>>({});
  private aaProxyMapSubject: BehaviorSubject<Record<string, AAProxy>> = new BehaviorSubject<Record<string, AAProxy>>({});

  static instance: AccountAbstractionService;

  private constructor (initConfig: AAServiceConfigInit) {
    this.configSubject.next({
      providers: initConfig.providers || DEFAULT_CONFIG.providers,
      providerConfig: Object.assign({}, DEFAULT_CONFIG.providerConfig, initConfig.providerConfig)
    });

    this.configSubject.subscribe(() => {
      this.refreshMap();
    });

    this.proxyToOwnerSubject.subscribe((value) => console.debug('AccountAbstractionService', 'proxyToOwnerSubject', value));
    this.addressToProxySubject.subscribe((value) => console.debug('AccountAbstractionService', 'addressToProxySubject', value));
    this.aaProxyMapSubject.subscribe((value) => console.debug('AccountAbstractionService', 'aaProxyMapSubject', value));
  }

  private refreshMap () {
    this.aaProxyMapSubject.next({});
    this.addressToProxySubject.next({});

    const owners = Object.values(this.values.proxyToOwner);

    for (const owner of owners) {
      this.createAccountAbstraction(owner).catch(console.error);
    }
  }

  get values () {
    const configSubject = this.configSubject;
    const proxyToOwnerSubject = this.proxyToOwnerSubject;
    const addressToProxySubject = this.addressToProxySubject;
    const aaProxyMapSubject = this.aaProxyMapSubject;

    return {
      get config () {
        return configSubject.getValue();
      },
      get proxyToOwner () {
        return proxyToOwnerSubject.getValue();
      },
      get addressToProxy () {
        return addressToProxySubject.getValue();
      },
      get aaProxyMap () {
        return aaProxyMapSubject.getValue();
      }
    };
  }

  get observables () {
    const configSubject = this.configSubject;
    const aaProxyMapSubject = this.aaProxyMapSubject;

    return {
      get config () {
        return configSubject.asObservable();
      },
      get aaProxyMap () {
        return aaProxyMapSubject.asObservable();
      }
    };
  }

  public setOwners (owners: Record<string, string>) {
    this.proxyToOwnerSubject.next(owners);
    this.refreshMap();
  }

  updateConfig (provider: AAProvider, config: AAProviderConfig) {
    const _config = structuredClone(this.values.config);

    _config.providerConfig[provider] = config;

    this.configSubject.next(_config);
  }

  private getProxyIdByOwner (owner: string): string {
    const proxyToOwner = this.values.proxyToOwner;

    for (const [proxyId, _owner] of Object.entries(proxyToOwner)) {
      if (_owner === owner) {
        return proxyId;
      }
    }

    return '';
  }

  removeOwner (owner: string) {
    const proxyToOwner = structuredClone(this.values.proxyToOwner);

    const proxyId = this.getProxyIdByOwner(owner);

    if (!proxyId) {
      return;
    }

    // Remove the owner map
    delete proxyToOwner[proxyId];

    // Remove the proxy map
    const aaProxyMap = structuredClone(this.aaProxyMapSubject.getValue());

    delete aaProxyMap[proxyId];

    // Remove the address map
    const addressToProxy = structuredClone(this.addressToProxySubject.getValue());
    const toRemove: string[] = [];

    for (const [address, _proxyId] of Object.entries(addressToProxy)) {
      if (_proxyId === proxyId) {
        toRemove.push(address);
      }
    }

    toRemove.forEach((address) => {
      delete addressToProxy[address];
    });

    this.proxyToOwnerSubject.next(proxyToOwner);
    this.addressToProxySubject.next(addressToProxy);
    this.aaProxyMapSubject.next(aaProxyMap);
  }

  addOwner (owner: string): string {
    const proxyToOwner = structuredClone(this.values.proxyToOwner);

    const _proxyId = this.getProxyIdByOwner(owner);

    if (_proxyId) {
      return _proxyId;
    }

    const proxyId = createAccountProxyId(owner);

    proxyToOwner[proxyId] = owner;

    this.proxyToOwnerSubject.next(proxyToOwner);

    return proxyId;
  }

  async getAndCreateAAProxyIfNeed (address: string): Promise<AAProxy> {
    const proxyId = this.addressToProxySubject.getValue()[address];

    if (proxyId) {
      return this.aaProxyMapSubject.getValue()[proxyId];
    } else {
      return this.createAccountAbstraction(address);
    }
  }

  private async createAAKlaster (owner: string): Promise<AAAccount> {
    const config = this.values.config.providerConfig[AAProvider.KLASTER];
    const address = await KlasterService.getSmartAccount(owner, config);

    return {
      address: address,
      type: AAAccountType.CONTRACT,
      chainIds: getSupportedChainIds(AAProvider.KLASTER, config),
      owner,
      provider: AAProvider.KLASTER,
      providerConfig: this.values.config.providerConfig[AAProvider.KLASTER]
    };
  }

  private async createAAParticle (owner: string): Promise<AAAccount> {
    const config = this.values.config.providerConfig[AAProvider.PARTICLE];
    const address = await ParticleService.getSmartAccount(owner, config);

    return {
      address: address,
      type: AAAccountType.CONTRACT,
      chainIds: getSupportedChainIds(AAProvider.PARTICLE, config),
      owner,
      provider: AAProvider.PARTICLE,
      providerConfig: this.values.config.providerConfig[AAProvider.PARTICLE]
    };
  }

  public async createAccountAbstraction (owner: string): Promise<AAProxy> {
    const providers = this.values.config.providers;

    if (providers.length === 0) {
      throw new Error('No provider available');
    }

    const contractAccounts: AAAccount[] = [];

    for (const provider of providers) {
      switch (provider) {
        case AAProvider.KLASTER:
          contractAccounts.push(await this.createAAKlaster(owner));
          break;
        case AAProvider.PARTICLE:
          contractAccounts.push(await this.createAAParticle(owner));
          break;
        default:
          throw new Error('Unsupported provider');
      }
    }

    const ownerAccount: AAAccount = {
      address: owner,
      type: AAAccountType.EOA,
      chainIds: [],
      owner
    };

    const proxyId = this.addOwner(owner);

    const aaProxy: AAProxy = {
      accounts: [ownerAccount, ...contractAccounts],
      owner,
      id: proxyId
    };

    // Save the proxy map
    const aaProxyMap = structuredClone(this.aaProxyMapSubject.getValue());

    aaProxyMap[proxyId] = aaProxy;

    this.aaProxyMapSubject.next(aaProxyMap);

    // Save the address map
    const addressToProxy = structuredClone(this.values.addressToProxy);

    addressToProxy[owner] = proxyId;

    for (const contractAccount of contractAccounts) {
      addressToProxy[contractAccount.address] = proxyId;
    }

    this.addressToProxySubject.next(addressToProxy);

    return aaProxy;
  }

  private findAccount (address: string): AAAccount | undefined {
    const proxyId = this.values.addressToProxy[address];

    if (!proxyId) {
      return undefined;
    }

    const aaProxy = this.values.aaProxyMap[proxyId];

    return aaProxy.accounts.find((account) => account.address === address);
  }

  private async _createKlasterTransactions (account: AAAccount, txList: RawTransactionConfig[]): Promise<CreateTransactionResult> {
    const owner = account.owner as string;
    const config = account.providerConfig as AAProviderConfig;
    const klasterService = await KlasterService.createKlasterService(owner, config);
    const transactions = await klasterService.buildTx(txList);

    return {
      signer: owner,
      transactions
    };
  }

  private async _createEoaTransactions (account: AAAccount, txList: RawTransactionConfig[]): Promise<CreateTransactionResult> {
    return Promise.resolve({
      signer: account.owner as string,
      transactions: txList
    });
  }

  private async _createParticleTransactions (account: AAAccount, txList: RawTransactionConfig[]): Promise<CreateTransactionResult> {
    const owner = account.owner as string;
    const config = account.providerConfig as AAProviderConfig;
    const userOpBundles = await ParticleService.createUserOperations(owner, config, txList);

    return {
      signer: owner,
      transactions: userOpBundles
    };
  }

  private async _createTransaction (account: AAAccount, txList: RawTransactionConfig[]): Promise<CreateTransactionResult> {
    if (account.type === AAAccountType.EOA) {
      return this._createEoaTransactions(account, txList);
    } else {
      switch (account.provider) {
        case AAProvider.KLASTER:
          return this._createKlasterTransactions(account, txList);
        case AAProvider.PARTICLE:
          return this._createParticleTransactions(account, txList);
        default:
          throw new Error('Unsupported provider');
      }
    }
  }

  public async createTransactions (address: string, txList: RawTransactionConfig[]): Promise<CreateTransactionResult> {
    const account = this.findAccount(address);

    if (!account) {
      throw new Error('Account not found');
    }

    return this._createTransaction(account, txList);
  }

  static createInstance (initConfig: AAServiceConfigInit) {
    if (!AccountAbstractionService.instance) {
      AccountAbstractionService.instance = new AccountAbstractionService(initConfig);
    } else {
      throw new Error('AccountAbstractionService instance already exists');
    }
  }

  static getInstance () {
    if (!AccountAbstractionService.instance) {
      throw new Error('AccountAbstractionService instance does not exist');
    }

    return AccountAbstractionService.instance;
  }
}
