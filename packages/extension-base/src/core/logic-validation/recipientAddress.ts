// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { ActionType, ValidateRecipientParams, ValidationCondition } from '@subwallet/extension-base/core/types';
import { _isAddress, _isNotDuplicateAddress, _isNotNull, _isSupportLedgerAccount, _isValidAddressForEcosystem, _isValidSubstrateAddressFormat } from '@subwallet/extension-base/core/utils';
import { isTonAddress } from '@subwallet/keyring';

import { isEthereumAddress } from '@polkadot/util-crypto';

function getConditions (validateRecipientParams: ValidateRecipientParams): ValidationCondition[] {
  const { account, actionType, autoFormatValue, destChainInfo, srcChain, toAddress } = validateRecipientParams;
  const conditions: ValidationCondition[] = [];
  const isSendAction = [ActionType.SEND_FUND, ActionType.SEND_NFT].includes(actionType);

  conditions.push(ValidationCondition.IS_NOT_NULL);
  conditions.push(ValidationCondition.IS_ADDRESS);
  conditions.push(ValidationCondition.IS_VALID_ADDRESS_FOR_ECOSYSTEM);

  if (!isEthereumAddress(toAddress) && !isTonAddress(toAddress) && !autoFormatValue) {
    // todo: need isSubstrateAddress util function to check exactly
    conditions.push(ValidationCondition.IS_VALID_SUBSTRATE_ADDRESS_FORMAT);
  }

  if (srcChain === destChainInfo.slug && isSendAction && !destChainInfo.tonInfo) {
    conditions.push(ValidationCondition.IS_NOT_DUPLICATE_ADDRESS);
  }

  if (account?.isHardware) {
    conditions.push(ValidationCondition.IS_SUPPORT_LEDGER_ACCOUNT);
  }

  return conditions;
}

function getValidationFunctions (conditions: ValidationCondition[]): Array<(validateRecipientParams: ValidateRecipientParams) => Promise<void>> {
  const validationFunctions: Array<(validateRecipientParams: ValidateRecipientParams) => Promise<void>> = [];

  for (const condition of conditions) {
    switch (condition) {
      case ValidationCondition.IS_NOT_NULL: {
        validationFunctions.push(_isNotNull);
      }

        break;

      case ValidationCondition.IS_ADDRESS: {
        validationFunctions.push(_isAddress);

        break;
      }

      case ValidationCondition.IS_VALID_ADDRESS_FOR_ECOSYSTEM: {
        validationFunctions.push(_isValidAddressForEcosystem);

        break;
      }

      case ValidationCondition.IS_VALID_SUBSTRATE_ADDRESS_FORMAT: {
        validationFunctions.push(_isValidSubstrateAddressFormat);

        break;
      }

      case ValidationCondition.IS_NOT_DUPLICATE_ADDRESS: {
        validationFunctions.push(_isNotDuplicateAddress);

        break;
      }

      case ValidationCondition.IS_SUPPORT_LEDGER_ACCOUNT: {
        validationFunctions.push(_isSupportLedgerAccount);

        break;
      }
    }
  }

  return validationFunctions;
}

function runValidationFunctions (validateRecipientParams: ValidateRecipientParams, validationFunctions: Array<(validateRecipientParams: ValidateRecipientParams) => Promise<void>>): Promise<void>[] {
  const validationResults: Promise<void>[] = [];

  for (const validationFunction of validationFunctions) {
    validationResults.push(validationFunction(validateRecipientParams));
  }

  return validationResults;
}

export function validateRecipientAddress (validateRecipientParams: ValidateRecipientParams): Promise<void> {
  const conditions = getConditions(validateRecipientParams);
  const validationFunctions = getValidationFunctions(conditions);
  const validationResults = runValidationFunctions(validateRecipientParams, validationFunctions);

  return validationResults[0];
}
