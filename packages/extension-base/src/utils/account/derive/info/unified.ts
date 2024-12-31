// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountProxyMap, AccountProxyType, DeriveInfo, NextDerivePair } from '@subwallet/extension-base/types';

import { validateUnifiedDerivationPath } from '../validate';
import { getSoloDerivationInfo } from './solo';

export const getUnifiedDerivationInfo = (suri?: string): DeriveInfo => {
  if (suri) {
    const validateUnifiedRs = validateUnifiedDerivationPath(suri);

    if (validateUnifiedRs) {
      const { autoIndexes, depth } = validateUnifiedRs;

      return {
        suri: suri,
        depth,
        autoIndexes
      };
    }
  }

  return {
    depth: 0,
    suri
  };
};

/**
 * @func findUnifiedNextDerive
 * @return {NextDerivePair}
 * */
export const findUnifiedNextDerive = (proxyId: string, accounts: AccountProxyMap): NextDerivePair => {
  const currentProxy = accounts[proxyId];
  const parentProxyId = currentProxy.parentId || currentProxy.id;
  const parentProxy = accounts[parentProxyId];
  const deriveInfo = getUnifiedDerivationInfo(currentProxy.suri);
  const currentDepth = deriveInfo.depth;
  const currentIndex = deriveInfo.autoIndexes?.[currentDepth - 1];
  const children = parentProxy.children?.map((id) => accounts[id]) || [];
  const childrenMetadata = children
    .map(({ accountType, accounts, suri }) => {
      if (accountType === AccountProxyType.UNIFIED) {
        return getUnifiedDerivationInfo(suri);
      } else {
        const account = accounts[0];

        return getSoloDerivationInfo(account.type, account);
      }
    })
    .filter(({ autoIndexes, depth }) => {
      if (depth !== currentDepth + 1) {
        return false;
      }

      if (autoIndexes?.includes(undefined)) {
        return false;
      }

      return currentIndex === autoIndexes?.[currentDepth - 1];
    })
    .sort((a, b) => {
      const aDeriveIndex = a.autoIndexes?.[currentDepth];
      const bDeriveIndex = b.autoIndexes?.[currentDepth];

      if (aDeriveIndex !== undefined && bDeriveIndex !== undefined) {
        return aDeriveIndex - bDeriveIndex;
      } else {
        if (aDeriveIndex === undefined && bDeriveIndex === undefined) {
          return 0;
        } else {
          return aDeriveIndex === undefined ? 1 : -1;
        }
      }
    });

  let index = currentDepth === 0 ? 1 : 0;

  for (const { autoIndexes, suri } of childrenMetadata) {
    const _autoIndexes = autoIndexes as number[];
    const deriveIndex = _autoIndexes[currentDepth];

    if (!suri || deriveIndex === undefined) {
      break;
    }

    if (deriveIndex === index) {
      index++;
    } else if (currentDepth === 0 && deriveIndex === 0 && index > deriveIndex) {
      // Special case for the first account on the root
    } else {
      break;
    }
  }

  const indexes: number[] = currentDepth > 0 ? (deriveInfo.autoIndexes || []) as number[] : [];

  indexes.push(index);

  const suri = '//'.concat(indexes.join('//'));

  return {
    deriveIndex: index,
    depth: currentDepth + 1,
    suri,
    deriveAddress: parentProxy.id
  };
};
