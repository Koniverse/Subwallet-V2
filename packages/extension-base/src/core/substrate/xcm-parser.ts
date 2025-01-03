// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { COMMON_CHAIN_SLUGS } from '@subwallet/chain-list';
import { _ChainAsset, _ChainInfo } from '@subwallet/chain-list/types';
import { _Address } from '@subwallet/extension-base/background/KoniTypes';
import { isAvailChainBridge } from '@subwallet/extension-base/services/balance-service/transfer/xcm/availBridge';
import { _isPolygonChainBridge } from '@subwallet/extension-base/services/balance-service/transfer/xcm/polygonBridge';
import { _isPosChainBridge } from '@subwallet/extension-base/services/balance-service/transfer/xcm/posBridge';
import { _getChainSubstrateAddressPrefix, _getEvmChainId, _getSubstrateParaId, _getSubstrateRelayParent, _getXcmAssetMultilocation, _isChainEvmCompatible, _isPureEvmChain, _isSubstrateParaChain } from '@subwallet/extension-base/services/chain-service/utils';

import { decodeAddress, evmToAddress } from '@polkadot/util-crypto';

const FOUR_INSTRUCTIONS_WEIGHT = 5000000000;
const UNLIMITED_WEIGHT = 'Unlimited';

export function _getXcmDestWeight (originChainInfo: _ChainInfo) {
  if (['pioneer'].includes(originChainInfo.slug)) {
    return FOUR_INSTRUCTIONS_WEIGHT;
  }

  return UNLIMITED_WEIGHT;
}

export function _getXcmBeneficiary (destChainInfo: _ChainInfo, recipient: _Address, version: number) {
  const receiverLocation = version < 4 // from V4, X1 is also an array
    ? _getRecipientLocation(destChainInfo, recipient, version)
    : [_getRecipientLocation(destChainInfo, recipient, version)];

  return {
    [`V${version}`]: {
      parents: 0,
      interior: {
        X1: receiverLocation
      }
    }
  };
}

export function _getXcmMultiAssets (tokenInfo: _ChainAsset, value: string, version: number) {
  const assetId = _getAssetIdentifier(tokenInfo, version);

  return {
    [`V${version}`]: [
      {
        id: assetId,
        fun: { Fungible: value }
      }
    ]
  };
}

export function _getXcmMultiLocation (originChainInfo: _ChainInfo, destChainInfo: _ChainInfo, version: number, recipient?: _Address) {
  const isWithinSameConsensus = _isXcmWithinSameConsensus(originChainInfo, destChainInfo);
  const parents = _getMultiLocationParent(originChainInfo, isWithinSameConsensus);
  const interior = _getMultiLocationInterior(destChainInfo, isWithinSameConsensus, version, recipient);

  return {
    [`V${version}`]: {
      parents,
      interior
    }
  };
}

export function _isXcmTransferUnstable (originChainInfo: _ChainInfo, destChainInfo: _ChainInfo, assetSlug: string): boolean {
  return !_isXcmWithinSameConsensus(originChainInfo, destChainInfo) || _isMythosFromHydrationToMythos(originChainInfo, destChainInfo, assetSlug) || _isPolygonBridgeXcm(originChainInfo, destChainInfo) || _isPosBridgeXcm(originChainInfo, destChainInfo);
}

function getAssetHubBridgeUnstableWarning (originChainInfo: _ChainInfo): string {
  switch (originChainInfo.slug) {
    case COMMON_CHAIN_SLUGS.POLKADOT_ASSET_HUB:
      return 'Cross-chain transfer of this token is not recommended as it is in beta and incurs a transaction fee of 2 DOT. Continue at your own risk';
    case COMMON_CHAIN_SLUGS.KUSAMA_ASSET_HUB:
      return 'Cross-chain transfer of this token is not recommended as it is in beta and incurs a transaction fee of 0.4 KSM. Continue at your own risk';
    default:
      return 'Cross-chain transfer of this token is not recommended as it is in beta and incurs a large transaction fee. Continue at your own risk';
  }
}

function getSnowBridgeUnstableWarning (originChainInfo: _ChainInfo): string {
  switch (originChainInfo.slug) {
    case COMMON_CHAIN_SLUGS.POLKADOT_ASSET_HUB:
      return 'Cross-chain transfer of this token is not recommended as it is in beta, incurs a fee of $70 and takes up to 1 hour to complete. Continue at your own risk';
    case COMMON_CHAIN_SLUGS.ETHEREUM:
      return 'Cross-chain transfer of this token is not recommended as it is in beta, incurs a fee of $5 and takes up to 1 hour to complete. Continue at your own risk';
    default:
      return 'Cross-chain transfer of this token is not recommended as it is in beta, incurs a high fee and takes up to 1 hour to complete. Continue at your own risk';
  }
}

function getMythosFromHydrationToMythosWarning (): string {
  return 'Cross-chain transfer of this token requires a high transaction fee. Do you want to continue?';
}

function getAvailBridgeWarning (): string {
  return 'Cross-chain transfer of this token may take up to 90 minutes, and you’ll need to manually claim the funds on the destination network to complete the transfer. Do you still want to continue?';
}

function getPolygonBridgeWarning (originChainInfo: _ChainInfo): string {
  if (originChainInfo.slug === COMMON_CHAIN_SLUGS.ETHEREUM || originChainInfo.slug === COMMON_CHAIN_SLUGS.ETHEREUM_SEPOLIA) {
    return 'Cross-chain transfer of this token may take up to 40 minutes. Do you still want to continue?';
  } else {
    return 'Cross-chain transfer of this token may take up to 3 hours, and you’ll need to manually claim the funds on the destination network to complete the transfer. Do you still want to continue?';
  }
}

function getPosBridgeWarning (originChainInfo: _ChainInfo): string {
  if (originChainInfo.slug === COMMON_CHAIN_SLUGS.ETHEREUM || originChainInfo.slug === COMMON_CHAIN_SLUGS.ETHEREUM_SEPOLIA) {
    return 'Cross-chain transfer of this token may take up to 22 minutes. Do you still want to continue?';
  } else {
    return 'Cross-chain transfer of this token may take up to 90 minutes, and you’ll need to manually claim the funds on the destination network to complete the transfer. Do you still want to continue?';
  }
}

export function _getXcmUnstableWarning (originChainInfo: _ChainInfo, destChainInfo: _ChainInfo, assetSlug: string): string {
  if (_isPosBridgeXcm(originChainInfo, destChainInfo)) {
    return getPosBridgeWarning(originChainInfo);
  } else if (_isPolygonBridgeXcm(originChainInfo, destChainInfo)) {
    return getPolygonBridgeWarning(originChainInfo);
  } else if (_isAvailBridgeXcm(originChainInfo, destChainInfo)) {
    return getAvailBridgeWarning();
  } else if (_isSnowBridgeXcm(originChainInfo, destChainInfo)) {
    return getSnowBridgeUnstableWarning(originChainInfo);
  } else if (_isMythosFromHydrationToMythos(originChainInfo, destChainInfo, assetSlug)) {
    return getMythosFromHydrationToMythosWarning();
  } else {
    return getAssetHubBridgeUnstableWarning(originChainInfo);
  }
}

export function _isXcmWithinSameConsensus (originChainInfo: _ChainInfo, destChainInfo: _ChainInfo): boolean {
  return _getSubstrateRelayParent(originChainInfo) === destChainInfo.slug || _getSubstrateRelayParent(destChainInfo) === originChainInfo.slug || _getSubstrateRelayParent(originChainInfo) === _getSubstrateRelayParent(destChainInfo);
}

export function _isSnowBridgeXcm (originChainInfo: _ChainInfo, destChainInfo: _ChainInfo): boolean {
  return !_isXcmWithinSameConsensus(originChainInfo, destChainInfo) && (_isPureEvmChain(originChainInfo) || _isPureEvmChain(destChainInfo));
}

export function _isAvailBridgeXcm (originChainInfo: _ChainInfo, destChainInfo: _ChainInfo): boolean {
  const isAvailBridgeFromEvm = _isPureEvmChain(originChainInfo) && isAvailChainBridge(destChainInfo.slug);
  const isAvailBridgeFromAvail = isAvailChainBridge(originChainInfo.slug) && _isPureEvmChain(destChainInfo);

  return isAvailBridgeFromEvm || isAvailBridgeFromAvail;
}

export function _isMythosFromHydrationToMythos (originChainInfo: _ChainInfo, destChainInfo: _ChainInfo, assetSlug: string): boolean {
  return originChainInfo.slug === 'hydradx_main' && destChainInfo.slug === 'mythos' && assetSlug === 'hydradx_main-LOCAL-MYTH';
}

export function _isPolygonBridgeXcm (originChainInfo: _ChainInfo, destChainInfo: _ChainInfo): boolean {
  return _isPolygonChainBridge(originChainInfo.slug, destChainInfo.slug);
}

export function _isPosBridgeXcm (originChainInfo: _ChainInfo, destChainInfo: _ChainInfo): boolean {
  return _isPosChainBridge(originChainInfo.slug, destChainInfo.slug);
}

// ---------------------------------------------------------------------------------------------------------------------

function _getMultiLocationParent (originChainInfo: _ChainInfo, isWithinSameConsensus: boolean): number {
  let parent = 0; // how many hops up the hierarchy

  if (_isSubstrateParaChain(originChainInfo)) {
    parent += 1;
  }

  if (!isWithinSameConsensus) {
    parent += 1;
  }

  return parent;
}

function _getMultiLocationInterior (destChainInfo: _ChainInfo, isWithinSameConsensus: boolean, version: number, recipient?: _Address): unknown {
  const junctions: unknown[] = [];

  if (isWithinSameConsensus) {
    if (_isSubstrateParaChain(destChainInfo)) {
      junctions.push({
        Parachain: _getSubstrateParaId(destChainInfo)
      });
    }
  } else {
    junctions.push({
      GlobalConsensus: _getGlobalConsensusJunction(destChainInfo, version)
    });

    if (_isSubstrateParaChain(destChainInfo)) {
      junctions.push({
        Parachain: _getSubstrateParaId(destChainInfo)
      });
    }
  }

  if (recipient) {
    junctions.push(_getRecipientLocation(destChainInfo, recipient, version));
  }

  if (junctions.length === 0 && !recipient) {
    return 'Here';
  }

  if (version < 4 && junctions.length === 1) {
    return {
      X1: junctions[0]
    };
  }

  return {
    [`X${junctions.length}`]: junctions
  };
}

function _getGlobalConsensusJunction (destChainInfo: _ChainInfo, version: number) {
  let chainSlug = destChainInfo.slug;
  let evmChainId: number | undefined;

  if (_isSubstrateParaChain(destChainInfo)) {
    const relaySlug = _getSubstrateRelayParent(destChainInfo);

    if (!relaySlug) {
      throw Error('Parachain must have a parent chainSlug');
    }

    chainSlug = relaySlug;
  } else {
    evmChainId = _getEvmChainId(destChainInfo);
  }

  if (evmChainId) {
    return {
      Ethereum: {
        chainId: evmChainId
      }
    };
  }

  switch (chainSlug) {
    case COMMON_CHAIN_SLUGS.POLKADOT:
      return version < 4 ? { Polkadot: null } : 'Polkadot';
    case COMMON_CHAIN_SLUGS.KUSAMA:
      return version < 4 ? { Kusama: null } : 'Kusama';
    default:
      return version < 4 ? { Rococo: null } : 'Rococo';
  }
}

function _getRecipientLocation (destChainInfo: _ChainInfo, recipient: _Address, version: number) {
  const network = _getNetworkByVersion(version);

  if (destChainInfo.slug === COMMON_CHAIN_SLUGS.ASTAR_EVM) {
    const ss58Address = evmToAddress(recipient, _getChainSubstrateAddressPrefix(destChainInfo)); // TODO: shouldn't pass addressPrefix directly

    return { AccountId32: { network, id: decodeAddress(ss58Address) } };
  }

  if (_isChainEvmCompatible(destChainInfo)) {
    return { AccountKey20: { network, key: recipient } };
  }

  return { AccountId32: { network, id: decodeAddress(recipient) } };
}

function _getAssetIdentifier (tokenInfo: _ChainAsset, version: number) {
  const _assetIdentifier = _getXcmAssetMultilocation(tokenInfo);

  if (!_assetIdentifier) {
    throw new Error('Asset must have multilocation');
  }

  const assetIdentifier = ['statemint-LOCAL-KSM', 'statemine-LOCAL-DOT'].includes(tokenInfo.slug) // todo: hotfix for ksm statemint recheck all chain
    ? _assetIdentifier
    : _adaptX1Interior(_assetIdentifier, version);

  return version >= 4 // from V4, Concrete is removed
    ? assetIdentifier
    : { Concrete: assetIdentifier };
}

export function _adaptX1Interior (_assetIdentifier: Record<string, any>, version: number): Record<string, any> {
  const assetIdentifier = structuredClone(_assetIdentifier);
  const interior = assetIdentifier.interior as Record<string, any>;
  const isInteriorObj = typeof interior === 'object' && interior !== null;
  const isX1 = isInteriorObj && 'X1' in interior;
  const needModifyX1 = version < 4 && Array.isArray(interior.X1);

  if (isInteriorObj && isX1 && needModifyX1) { // X1 is an object for version < 4. From V4, it's an array
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
    interior.X1 = interior.X1[0];
  }

  return assetIdentifier;
}

function _getNetworkByVersion (version: number) {
  switch (version) {
    case 1:
    case 2:
      return 'Any';
    case 3:
    case 4:
      return undefined;
    default:
      return undefined;
  }
}
