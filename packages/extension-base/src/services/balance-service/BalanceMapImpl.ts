// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ALL_ACCOUNT_KEY } from '@subwallet/extension-base/constants';
import KoniState from '@subwallet/extension-base/koni/background/handlers/State';
import { AccountProxyType, BalanceInfo, BalanceItem, BalanceMap } from '@subwallet/extension-base/types';
import { isAccountAll } from '@subwallet/extension-base/utils';
import { BehaviorSubject } from 'rxjs';

import { groupBalance } from './helpers';

export class BalanceMapImpl {
  private _mapSubject: BehaviorSubject<BalanceMap>;

  constructor (private state: KoniState, private _map: BalanceMap = {}) {
    this._mapSubject = new BehaviorSubject<BalanceMap>(_map);
  }

  public get map (): BalanceMap {
    return this._mapSubject.getValue();
  }

  public get mapSubject () {
    return this._mapSubject;
  }

  public setData (map: BalanceMap) {
    this._map = map;
    this.triggerChange();
  }

  public setAddressData (address: string, data: BalanceInfo) {
    this._map[address] = data;
    this.triggerChange();
  }

  public triggerChange (computeAll?: boolean): void {
    if (computeAll) {
      this.computeAllAccountBalance();
    }

    this._mapSubject.next(this._map);
  }

  public updateBalanceItem (balanceItem: BalanceItem, trigger = false): void {
    const { address, tokenSlug } = balanceItem;

    if (!this._map[address]) {
      this._map[address] = {};
    }

    this._map[address][tokenSlug] = balanceItem;

    trigger && this.triggerChange();
  }

  public updateBalanceItems (balanceItems: BalanceItem[], computeAll?: boolean): void {
    balanceItems.forEach((balanceItem) => {
      this.updateBalanceItem(balanceItem);
    });

    this.triggerChange(computeAll);
  }

  public removeBalanceItemByFilter (filter: (balanceItem: BalanceItem) => boolean): void {
    Object.keys(this._map).forEach((address) => {
      Object.keys(this._map[address]).forEach((tokenSlug) => {
        if (filter(this._map[address][tokenSlug])) {
          delete this._map[address][tokenSlug];
        }
      });
    });

    this.triggerChange();
  }

  public computeAllAccountBalance () {
    const compoundMap: Record<string, Record<string, BalanceItem[]>> = {};
    const accountProxies = this.state.keyringService.context.accounts;
    const unifiedAccountsMap = Object.values(accountProxies)
      .filter((value) => value.accountType === AccountProxyType.UNIFIED)
      .reduce<Record<string, string[]>>((rs, value) => {
      rs[value.id] = value.accounts.map((account) => account.address);

      return rs;
    }, {});
    const revertUnifiedAccountsMap = Object.entries(unifiedAccountsMap)
      .reduce<Record<string, string>>((rs, [proxyId, accounts]) => {
      for (const account of accounts) {
        rs[account] = proxyId;
      }

      return rs;
    }, {});

    const proxyIds = Object.keys(unifiedAccountsMap);

    Object.keys(this._map)
      .filter((a) => !isAccountAll(a) && !proxyIds.includes(a))
      .forEach((address) => {
        const addItemToMap = (key: string) => {
          const unifiedAccountBalance = compoundMap[key] || {};

          Object.keys(this._map[address]).forEach((tokenSlug) => {
            if (!unifiedAccountBalance[tokenSlug]) {
              unifiedAccountBalance[tokenSlug] = [];
            }

            unifiedAccountBalance[tokenSlug].push(this._map[address][tokenSlug]);
          });

          compoundMap[key] = unifiedAccountBalance;
        };

        addItemToMap(ALL_ACCOUNT_KEY);
        const proxyId = revertUnifiedAccountsMap[address];

        proxyId && addItemToMap(proxyId);
      });

    Object.entries(compoundMap).forEach(([compoundKey, balanceMap]) => {
      const rs: BalanceInfo = {};

      Object.entries(balanceMap).forEach(([tokenSlug, balanceItems]) => {
        rs[tokenSlug] = groupBalance(balanceItems, tokenSlug, tokenSlug);
      });

      this._map[compoundKey] = rs;
    });

    console.debug('balanceMap', this._map);
  }

  // Remove balance items buy address or tokenSlug
  public removeBalanceItems (addresses?: string[], tokenSlugs?: string[]): void {
    // If addresses is empty, remove all
    if (addresses && tokenSlugs) {
      addresses.forEach((address) => {
        tokenSlugs.forEach((tokenSlug) => {
          this._map[address] && this._map[address][tokenSlug] && delete this._map[address][tokenSlug];
        });
      });
    } else if (addresses && !tokenSlugs) {
      addresses.forEach((address) => {
        this._map[address] && delete this._map[address];
      });
    } else if (!addresses && tokenSlugs) {
      Object.keys(this._map).forEach((address) => {
        tokenSlugs.forEach((tokenSlug) => {
          this._map[address][tokenSlug] && delete this._map[address][tokenSlug];
        });
      });
    } else {
      this._map = {};
    }

    this.triggerChange();
  }
}
