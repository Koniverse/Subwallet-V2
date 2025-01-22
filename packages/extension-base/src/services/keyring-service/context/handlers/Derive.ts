// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { ALL_ACCOUNT_KEY } from '@subwallet/extension-base/constants';
import { AccountJson, AccountProxyData, CommonAccountErrorType, CreateDeriveAccountInfo, DeriveAccountInfo, DeriveErrorType, NextDerivePair, RequestDeriveCreateMultiple, RequestDeriveCreateV3, RequestDeriveValidateV2, RequestGetDeriveAccounts, RequestGetDeriveSuggestion, ResponseDeriveValidateV2, ResponseGetDeriveAccounts, ResponseGetDeriveSuggestion, SWCommonAccountError, SWDeriveError } from '@subwallet/extension-base/types';
import { createAccountProxyId, derivePair, findSoloNextDerive, findUnifiedNextDerive, getSoloDerivationInfo, parseUnifiedSuriToDerivationPath, validateDerivationPath } from '@subwallet/extension-base/utils';
import { EthereumKeypairTypes, KeypairType, KeyringPair, KeyringPair$Meta, SubstrateKeypairTypes } from '@subwallet/keyring/types';
import { keyring } from '@subwallet/ui-keyring';
import { t } from 'i18next';

import { assert } from '@polkadot/util';

import { AccountBaseHandler } from './Base';

const validDeriveKeypairTypes: KeypairType[] = [...SubstrateKeypairTypes, ...EthereumKeypairTypes, 'ton', 'cardano'];

/**
 * @class AccountDeriveHandler
 * @extends AccountBaseHandler
 * @description Handler for account derivation
 * */
export class AccountDeriveHandler extends AccountBaseHandler {
  /* Derive */

  /**
   * @func derivationCreateMultiple
   * @desc Derive multi account
   * @todo Must update before re-use
   * @deprecated
   */
  public derivationCreateMultiple ({ isAllowed, items, parentAddress }: RequestDeriveCreateMultiple): boolean {
    const parentPair = keyring.getPair(parentAddress);
    const isEvm = parentPair.type === 'ethereum';

    if (parentPair.isLocked) {
      keyring.unlockPair(parentPair.address);
    }

    const createChild = ({ name, suri }: CreateDeriveAccountInfo): KeyringPair => {
      const meta: KeyringPair$Meta = {
        name: name,
        parentAddress
      };

      if (isEvm) {
        let index = 0;

        try {
          const reg = /^\d+$/;
          const path = suri.split('//')[1];

          if (reg.test(path)) {
            index = parseInt(path);
          }
        } catch (e) {

        }

        if (!index) {
          throw new SWDeriveError(DeriveErrorType.INVALID_DERIVATION_PATH);
        }

        meta.suri = `//${index}`;

        return parentPair.evm.derive(index, meta);
      } else {
        meta.suri = suri;

        return parentPair.substrate.derive(suri, meta);
      }
    };

    const result: KeyringPair[] = [];

    for (const item of items) {
      try {
        const childPair = createChild(item);
        const address = childPair.address;

        keyring.addPair(childPair, true);
        this.state._addAddressToAuthList(address, isAllowed);
        result.push(childPair);
      } catch (e) {
        console.log(e);
      }
    }

    if (result.length === 1) {
      this.state.saveCurrentAccountProxyId(result[0].address);
    } else {
      this.state.saveCurrentAccountProxyId(ALL_ACCOUNT_KEY);
    }

    return true;
  }

  /**
   * @func getListDeriveAccounts
   * @desc Get a derivation account list.
   * @todo Must update before re-use
   * @deprecated
   */
  public getListDeriveAccounts ({ limit, page, parentAddress }: RequestGetDeriveAccounts): ResponseGetDeriveAccounts {
    const parentPair = keyring.getPair(parentAddress);
    const isEvm = parentPair.type === 'ethereum';

    if (parentPair.isLocked) {
      keyring.unlockPair(parentPair.address);
    }

    const start = (page - 1) * limit + (isEvm ? 1 : 0);
    const end = start + limit;

    const result: DeriveAccountInfo[] = [];

    for (let i = start; i < end; i++) {
      const suri = `//${i}`;
      const pair = isEvm ? parentPair.evm.derive(i, {}) : parentPair.substrate.derive(suri, {});

      result.push({ address: pair.address, suri: suri });
    }

    return {
      result: result
    };
  }

  /* Validate derivation path */
  public validateDerivePath ({ proxyId, suri }: RequestDeriveValidateV2): ResponseDeriveValidateV2 {
    const isUnified = this.state.isUnifiedAccount(proxyId);

    let type: KeypairType | undefined;

    if (!isUnified) {
      try {
        const pair = keyring.getPair(proxyId);

        type = pair.type;
      } catch (e) {
        throw new SWCommonAccountError(CommonAccountErrorType.ACCOUNT_NOT_FOUND);
      }
    }

    const derivationInfo = validateDerivationPath(suri, type);
    const account = this.state.accounts[proxyId];

    if (derivationInfo) {
      const accountTypes = account.accounts.map((acc) => acc.type);

      /* Minimum depth is 1 */
      if (derivationInfo.depth < 1) {
        return {
          info: undefined,
          error: (new SWDeriveError(DeriveErrorType.MIN_DERIVATION_DEPTH)).toJSON()
        };
      }

      /* Maximum depth is 2 */
      if (derivationInfo.depth > 2) {
        return {
          info: undefined,
          error: (new SWDeriveError(DeriveErrorType.MAX_DERIVATION_DEPTH)).toJSON()
        };
      }

      if (isUnified && derivationInfo.type === 'unified') {
        return {
          info: derivationInfo
        };
      } else if (accountTypes.includes(derivationInfo.type as KeypairType)) {
        return {
          info: derivationInfo
        };
      } else {
        return {
          info: undefined,
          error: (new SWDeriveError(DeriveErrorType.INVALID_DERIVATION_TYPE)).toJSON()
        };
      }
    } else {
      return {
        info: undefined,
        error: new SWDeriveError(DeriveErrorType.INVALID_DERIVATION_PATH).toJSON()
      };
    }
  }

  public getDeriveSuggestion ({ proxyId }: RequestGetDeriveSuggestion): ResponseGetDeriveSuggestion {
    const isUnified = this.state.isUnifiedAccount(proxyId);
    let rs: NextDerivePair;

    if (isUnified) {
      rs = findUnifiedNextDerive(proxyId, this.state.accounts);
    } else {
      let pair: KeyringPair | undefined;

      try {
        pair = keyring.getPair(proxyId);
      } catch (e) {}

      if (!pair) {
        return {
          proxyId,
          error: new SWCommonAccountError(CommonAccountErrorType.ACCOUNT_NOT_FOUND).toJSON()
        };
      }

      if (!validDeriveKeypairTypes.includes(pair.type)) {
        return {
          proxyId,
          error: new SWDeriveError(DeriveErrorType.INVALID_ACCOUNT_TYPE).toJSON()
        };
      }

      rs = findSoloNextDerive(proxyId);
    }

    return {
      proxyId,
      info: {
        suri: rs.suri,
        derivationPath: rs.derivationPath
      }
    };
  }

  /**
   * Derive account proxy
   *  */
  public derivationAccountProxyCreate (request: RequestDeriveCreateV3, isMigration = false): boolean {
    const { name, proxyId: deriveId, suri } = request;
    const isUnified = this.state.isUnifiedAccount(deriveId);

    const parentProxyId = this.state.belongUnifiedAccount(deriveId) || deriveId;
    const rootId = this.state.value.accounts[parentProxyId].parentId || parentProxyId;
    const rootProxyId = this.state.belongUnifiedAccount(rootId) || rootId;

    const nameExists = this.state.checkNameExists(name);

    if (nameExists && !isMigration) {
      throw new SWCommonAccountError(CommonAccountErrorType.ACCOUNT_NAME_EXISTED);
    }

    const validateRs = this.validateDerivePath({ proxyId: deriveId, suri });

    if (!validateRs.info) {
      if (validateRs.error) {
        throw Error(validateRs.error.message);
      } else {
        throw new SWDeriveError(DeriveErrorType.INVALID_DERIVATION_PATH);
      }
    }

    const derivationInfo = validateRs.info;

    const pairs: KeyringPair[] = [];
    const modifyPairs = this.state.modifyPairs;
    let childAccountProxy: AccountProxyData | undefined;
    let proxyId: string;

    /**
     * Can change to deep find root pair
     * Now all root pair is in the first level, so don't need to deep find
     */
    const findRootPair = (account: AccountJson): KeyringPair | undefined => {
      const deriveInfo = getSoloDerivationInfo(account.type, account);
      const needChangeRoot = deriveInfo.depth > 0;
      let rootPair: KeyringPair | undefined;

      if (needChangeRoot) {
        try {
          rootPair = keyring.getPair(account.parentAddress as string || '');
        } catch (e) {

        }
      } else {
        try {
          rootPair = keyring.getPair(account.address);
        } catch (e) {

        }
      }

      return rootPair;
    };

    if (derivationInfo.type === 'unified') {
      const accountProxy = this.state.value.accounts[deriveId];

      if (!accountProxy) {
        throw new SWCommonAccountError(CommonAccountErrorType.ACCOUNT_NOT_FOUND);
      }

      const accounts = accountProxy.accounts;

      proxyId = createAccountProxyId(rootProxyId, suri);

      for (const account of accounts) {
        const rootPair = findRootPair(account);

        if (!rootPair) {
          throw new SWDeriveError(DeriveErrorType.ROOT_ACCOUNT_NOT_FOUND);
        }

        const derivationPath = parseUnifiedSuriToDerivationPath(derivationInfo.suri, account.type);
        const childPair = derivePair(rootPair, request.name, derivationInfo.suri, derivationPath);
        const address = childPair.address;

        modifyPairs[address] = { accountProxyId: proxyId, migrated: true, key: address };
        pairs.push(childPair);
      }

      childAccountProxy = { id: proxyId, name, parentId: rootProxyId, suri: suri };
    } else {
      const type = derivationInfo.type;

      if (isUnified) {
        const accountProxy = this.state.value.accounts[deriveId];
        const account = accountProxy.accounts.find((account) => account.type === type);

        if (!account) {
          throw new SWCommonAccountError(CommonAccountErrorType.ACCOUNT_NOT_FOUND);
        }

        const rootPair = findRootPair(account);

        if (!rootPair) {
          throw new SWDeriveError(DeriveErrorType.ROOT_ACCOUNT_NOT_FOUND);
        }

        const childPair = derivePair(rootPair, request.name, derivationInfo.suri, derivationInfo.derivationPath);
        const address = childPair.address;

        proxyId = address;
        modifyPairs[address] = { accountProxyId: proxyId, migrated: true, key: address };
        childAccountProxy = { id: proxyId, name, parentId: rootProxyId, suri: suri };
        pairs.push(childPair);
      } else {
        const account = this.state.value.accounts[deriveId].accounts[0];

        if (!account) {
          throw new SWCommonAccountError(CommonAccountErrorType.ACCOUNT_NOT_FOUND);
        }

        const rootPair = findRootPair(account);

        if (!rootPair) {
          throw new SWDeriveError(DeriveErrorType.ROOT_ACCOUNT_NOT_FOUND);
        }

        const childPair = derivePair(rootPair, request.name, derivationInfo.suri, derivationInfo.derivationPath);

        const address = childPair.address;

        proxyId = address;

        if (rootProxyId) {
          modifyPairs[address] = { accountProxyId: proxyId, migrated: true, key: address };
          childAccountProxy = { id: proxyId, name, parentId: rootProxyId, suri: suri };
        }

        pairs.push(childPair);
      }
    }

    const addresses = pairs.map((pair) => pair.address);
    const exists = this.state.checkAddressExists(addresses);

    if (!isMigration) {
      assert(!exists, t('Account already exists under the name "{{name}}"', { replace: { name: exists?.name || exists?.address || '' } }));
    }

    childAccountProxy && this.state.upsertAccountProxyByKey(childAccountProxy);
    this.state.upsertModifyPairs(modifyPairs);

    for (const childPair of pairs) {
      keyring.addPair(childPair, true);
    }

    this.state.updateMetadataForPair();
    this.state.updateMetadataForProxy();
    this.state.saveCurrentAccountProxyId(proxyId, () => {
      this.state._addAddressesToAuthList(pairs.map((pair) => pair.address), true);
    });

    return true;
  }

  /* Derive */
}
