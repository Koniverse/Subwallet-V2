// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { RequestMigrateUnifiedAndFetchEligibleSoloAccounts, RequestPingSession, ResponseMigrateUnifiedAndFetchEligibleSoloAccounts, SoloAccountToBeMigrated } from '@subwallet/extension-base/background/KoniTypes';
import { AccountBaseHandler } from '@subwallet/extension-base/services/keyring-service/context/handlers/Base';
import { AccountChainType, AccountProxy, SUPPORTED_ACCOUNT_CHAIN_TYPES } from '@subwallet/extension-base/types';
import { createAccountProxyId, getDefaultKeypairTypeFromAccountChainType, getSuri } from '@subwallet/extension-base/utils';
import { keyring } from '@subwallet/ui-keyring';

import { keyExtractSuri } from '@polkadot/util-crypto';

export const SESSION_TIMEOUT = 10000;

interface SessionInfo {
  password: string,
  timeoutId: NodeJS.Timeout
}

export class AccountMigrationHandler extends AccountBaseHandler {
  private sessionIdToPassword: Record<string, SessionInfo> = {};

  public pingSession ({ sessionId }: RequestPingSession) {
    console.log(this.sessionIdToPassword);

    if (!this.sessionIdToPassword[sessionId]) { // todo: if no persistent sessionId, should we jump to enter password again?
      throw Error(`Session ID ${sessionId} not found.`);
    }

    clearTimeout(this.sessionIdToPassword[sessionId].timeoutId);
    this.sessionIdToPassword[sessionId].timeoutId = setTimeout(() => {
      delete this.sessionIdToPassword[sessionId];
    }, SESSION_TIMEOUT);

    return true;
  }

  public async migrateUnifiedAndFetchEligibleSoloAccounts (request: RequestMigrateUnifiedAndFetchEligibleSoloAccounts): Promise<ResponseMigrateUnifiedAndFetchEligibleSoloAccounts> {
    // Get MigrateUnified
    const password = request.password;
    const accountProxies = Object.values(this.state.accounts);
    const UACanBeMigrated = this.getUACanBeMigrated(accountProxies);
    const UACanBeMigratedSortedByParent = this.sortUAByParent(UACanBeMigrated); // master account should be migrated before derived account
    const migratedUnifiedAccountIds = await this.migrateUnifiedToUnifiedAccount(password, UACanBeMigratedSortedByParent);

    // Get EligibleSoloAccounts
    const rawSoloAccounts = this.getEligibleSoloAccounts(accountProxies);
    const rawEligibleSoloAccounts = this.groupSoloAccountByPair(password, rawSoloAccounts);
    const eligibleSoloAccountMap = this.accountProxiesToEligibleSoloAccountMap(rawEligibleSoloAccounts);

    // Create UniqueId
    const uniqueId = Date.now().toString();
    const timeoutId = setTimeout(() => delete this.sessionIdToPassword[uniqueId], SESSION_TIMEOUT * 2);
    this.sessionIdToPassword[uniqueId] = {
      password,
      timeoutId
    };

    return {
      migratedUnifiedAccountIds,
      soloAccounts: eligibleSoloAccountMap,
      sessionId: uniqueId
    };
  }

  public async migrateUnifiedToUnifiedAccount (password: string, accountProxies: AccountProxy[]): Promise<string[]> {
    const unifiedAccountIds: string[] = [];
    const modifiedPairs = structuredClone(this.state.modifyPairs);
    let notMigrateDeriveBefore = true;

    keyring.unlockKeyring(password);

    for (const unifiedAccount of accountProxies) {
      const masterAccount = !unifiedAccount.parentId;
      const proxyId = unifiedAccount.id;
      const name = unifiedAccount.name;

      if (masterAccount) {
        const mnemonic = this.parentService.context.exportAccountProxyMnemonic({
          password,
          proxyId
        }).result;

        const accountChainTypes = unifiedAccount.chainTypes;
        const newChainTypes = Object.values(AccountChainType).filter((type) => !accountChainTypes.includes(type) && SUPPORTED_ACCOUNT_CHAIN_TYPES.includes(type));
        const keypairTypes = newChainTypes.map((chainType) => getDefaultKeypairTypeFromAccountChainType(chainType));

        keypairTypes.forEach((type) => {
          const suri = getSuri(mnemonic, type);
          const pair = keyring.createFromUri(suri, {}, type);
          const address = pair.address;

          modifiedPairs[address] = { accountProxyId: proxyId, migrated: true, key: address };
        });

        this.state.upsertModifyPairs(modifiedPairs);
        keypairTypes.forEach((type) => {
          const suri = getSuri(mnemonic, type);
          const { derivePath } = keyExtractSuri(suri);
          const metadata = {
            name,
            derivationPath: derivePath ? derivePath.substring(1) : undefined
          };

          const rs = keyring.addUri(suri, metadata, type);
          const address = rs.pair.address;

          this.state._addAddressToAuthList(address, true);
        });

        unifiedAccountIds.push(proxyId);
      } else { // derived account
        if (notMigrateDeriveBefore) { // todo: can be optimized later
          await new Promise((resolve) => setTimeout(resolve, 2000));
          notMigrateDeriveBefore = false;
        }

        const suri = unifiedAccount.suri || '';

        this.parentService.context.derivationAccountProxyCreate({ name, suri, proxyId: unifiedAccount.parentId || '' }, true);
      }
    }

    return unifiedAccountIds;
  }

  public getUACanBeMigrated (accountProxies: AccountProxy[]): AccountProxy[] {
    return accountProxies.filter((account) => this.state.isUnifiedAccount(account.id) && account.isNeedMigrateUnifiedAccount);
  }

  public getEligibleSoloAccounts (accountProxies: AccountProxy[]): AccountProxy[] {
    return accountProxies.filter((account) => !this.state.isUnifiedAccount(account.id) && account.isNeedMigrateUnifiedAccount);
  }

  public groupSoloAccountByPair (password: string, accountProxies: AccountProxy[]) {
    const parentService = this.parentService;

    return accountProxies.reduce(function (rs: Record<string, AccountProxy[]>, item) {
      const oldProxyId = item.id;
      const mnemonic = parentService.context.exportAccountProxyMnemonic({
        password,
        proxyId: oldProxyId
      }).result;
      const upcomingProxyId = createAccountProxyId(mnemonic);

      if (!rs[upcomingProxyId]) {
        rs[upcomingProxyId] = [];
      }

      rs[upcomingProxyId].push(item);

      return rs;
    }, {});
  }

  public accountProxiesToEligibleSoloAccountMap (accountProxyMap: Record<string, AccountProxy[]>): Record<string, SoloAccountToBeMigrated[]> {
    const eligibleSoloAccountMap: Record<string, SoloAccountToBeMigrated[]> = {};

    Object.entries(accountProxyMap).forEach(([upcomingProxyId, accounts]) => {
      eligibleSoloAccountMap[upcomingProxyId] = accounts.map((account) => {
        return {
          upcomingProxyId,
          oldProxyId: account.accounts[0].proxyId,
          address: account.accounts[0].address,
          name: account.name,
          chainType: account.chainTypes[0]
        } as SoloAccountToBeMigrated;
      });
    });

    return eligibleSoloAccountMap;
  }

  public sortUAByParent (accountProxies: AccountProxy[]): AccountProxy[] {
    const undefinedToStr = (str: string | undefined) => str ?? '';

    return accountProxies.sort((a, b) => undefinedToStr(a.parentId) < undefinedToStr(b.parentId) ? -1 : undefinedToStr(a.parentId) > undefinedToStr(b.parentId) ? 1 : 0);
  }

  // public migrateSoloToUnifiedAccount () {
  //
  // }
}
