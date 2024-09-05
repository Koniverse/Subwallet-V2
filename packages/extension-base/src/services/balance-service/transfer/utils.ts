// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { ChainInfoMap } from '@subwallet/chain-list';
import { _isChainEvmCompatible, _isChainSubstrateCompatible, _isChainTonCompatible } from '@subwallet/extension-base/services/chain-service/utils';
import { AccountJson } from '@subwallet/extension-base/types';
import { detectTranslate, isAddressAndChainCompatible, isSameAddress, reformatAddress } from '@subwallet/extension-base/utils';
import { isAddress, isTonAddress } from '@subwallet/keyring';

import { isEthereumAddress } from '@polkadot/util-crypto';

export enum ActionType {
  SEND_FUND = 'SEND_FUND',
  SEND_NFT = 'SEND_NFT',
  SWAP = 'SWAP'
}

const LEDGER_GENERIC_ALLOW_NETWORKS = ['polkadot', 'statemint', 'bridgeHubPolkadot', 'collectives', 'centrifuge', 'manta_network', 'ajunaPolkadot', 'astar', 'bifrost_dot', 'hydradx_main', 'kusama', 'encointer', 'statemine', 'bridgeHubKusama', 'peopleKusama', 'altair', 'bajun', 'bifrost', 'calamari', 'shiden', 'tinkernet', 'rococo', 'rococo_assethub', 'hydradx_rococo', 'bifrost_testnet', 'westend', 'shibuya'];

type LedgerMustCheckType = 'polkadot' | 'migration' | 'unnecessary'

function ledgerMustCheckNetwork (account: AccountJson | null): LedgerMustCheckType {
  if (account && account.isHardware && account.isGeneric && !isEthereumAddress(account.address)) {
    return account.originGenesisHash ? 'migration' : 'polkadot';
  } else {
    return 'unnecessary';
  }
}

enum ValidationCondition {
  IS_NOT_NULL = 'IS_NOT_NULL',
  IS_ADDRESS = 'IS_ADDRESS',
  IS_VALID_ADDRESS = 'IS_VALID_ADDRESS',
  IS_VALID_SUBSTRATE_ADDRESS_FORMAT = 'IS_VALID_SUBSTRATE_ADDRESS_FORMAT',
  IS_NOT_DUPLICATE_ADDRESS = 'IS_NOT_DUPLICATE_ADDRESS',
  IS_SUPPORT_LEDGER_ACCOUNT = 'IS_SUPPORT_LEDGER_ACCOUNT'
}

function getConditions (srcChain: string, destChain: string, fromAddress: string, toAddress: string, account: AccountJson | null, actionType: ActionType): ValidationCondition[] {
  const conditions: ValidationCondition[] = [];
  const isSendAction = [ActionType.SEND_FUND, ActionType.SEND_NFT].includes(actionType);

  conditions.push(ValidationCondition.IS_NOT_NULL);
  conditions.push(ValidationCondition.IS_ADDRESS);
  conditions.push(ValidationCondition.IS_VALID_ADDRESS);

  if (!isEthereumAddress(toAddress) && !isTonAddress(toAddress)) {
    // todo: need isSubstrateAddress util function to check exactly
    // todo: add check advanced detection button
    conditions.push(ValidationCondition.IS_VALID_SUBSTRATE_ADDRESS_FORMAT);
  }

  if (srcChain === destChain && isSendAction && !ChainInfoMap[destChain].tonInfo) {
    conditions.push(ValidationCondition.IS_NOT_DUPLICATE_ADDRESS);
  }

  if (account?.isHardware) {
    conditions.push(ValidationCondition.IS_SUPPORT_LEDGER_ACCOUNT);
  }

  return conditions;
}

function getValidation (conditions: ValidationCondition[], srcChain: string, destChain: string, fromAddress: string, toAddress: string, account: AccountJson | null, actionType: ActionType): Promise<void> {
  const destChainInfo = ChainInfoMap[destChain];

  for (const condition of conditions) {
    if (condition === ValidationCondition.IS_NOT_NULL) {
      if (!toAddress) {
        return Promise.reject(detectTranslate('Recipient address is required'));
      }
    }

    if (condition === ValidationCondition.IS_ADDRESS) {
      if (!isAddress(toAddress)) {
        return Promise.reject(detectTranslate('Invalid recipient address'));
      }
    }

    if (condition === ValidationCondition.IS_VALID_ADDRESS) {
      if (!isAddressAndChainCompatible(toAddress, destChainInfo)) {
        if (_isChainEvmCompatible(destChainInfo)) {
          return Promise.reject(detectTranslate('The recipient address must be EVM type'));
        }

        if (_isChainSubstrateCompatible(destChainInfo)) {
          return Promise.reject(detectTranslate('The recipient address must be Substrate type'));
        }

        if (_isChainTonCompatible(destChainInfo)) {
          return Promise.reject(detectTranslate('The recipient address must be Ton type'));
        }

        return Promise.reject(detectTranslate('Unknown chain type'));
      }
    }

    if (condition === ValidationCondition.IS_VALID_SUBSTRATE_ADDRESS_FORMAT) {
      const addressPrefix = destChainInfo?.substrateInfo?.addressPrefix ?? 42;
      const toAddressFormatted = reformatAddress(toAddress, addressPrefix);

      if (toAddressFormatted !== toAddress) {
        return Promise.reject(detectTranslate(`Recipient should be a valid ${destChainInfo.name} address`));
      }
    }

    if (condition === ValidationCondition.IS_NOT_DUPLICATE_ADDRESS) {
      if (isSameAddress(fromAddress, toAddress)) {
        return Promise.reject(detectTranslate('The recipient address can not be the same as the sender address'));
      }
    }

    if (condition === ValidationCondition.IS_SUPPORT_LEDGER_ACCOUNT) {
      const ledgerCheck = ledgerMustCheckNetwork(account);

      if (ledgerCheck !== 'unnecessary' && !LEDGER_GENERIC_ALLOW_NETWORKS.includes(destChainInfo.slug)) {
        return Promise.reject(detectTranslate(`Ledger ${ledgerCheck === 'polkadot' ? 'Polkadot' : 'Migration'} address is not supported for this transfer`));
      }
    }
  }

  return Promise.resolve();
}

export function validateRecipientAddress (srcChain: string, destChain: string, fromAddress: string, toAddress: string, account: AccountJson | null, actionType: ActionType): Promise<void> {
  const conditions = getConditions(srcChain, destChain, fromAddress, toAddress, account, actionType);

  return getValidation(conditions, srcChain, destChain, fromAddress, toAddress, account, actionType);
}
