// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { _ChainAsset, _ChainInfo, _MultiChainAsset } from '@subwallet/chain-list/types';

const PRODUCTION_BRANCHES = ['master', 'webapp', 'webapp-dev'];
const branchName = process.env.BRANCH_NAME || 'subwallet-dev';
const fetchDomain = PRODUCTION_BRANCHES.indexOf(branchName) > -1 ? 'https://chain-list-assets.subwallet.app' : 'https://dev.sw-chain-list-assets.pages.dev';
const fetchFile = PRODUCTION_BRANCHES.indexOf(branchName) > -1 ? 'list.json' : 'preview.json';

const ChainListVersion = '0.2.98'; // update this when build chainlist

// todo: move this interface to chainlist
export interface PatchInfo {
  patchVersion: string,
  appliedVersion: string,
  fetchedDate: string,
  ChainInfo: Record<string, _ChainInfo>,
  ChainInfoHashMap: Record<string, string>,
  ChainAsset: Record<string, _ChainAsset>,
  ChainAssetHashMap: Record<string, string>,
  MultiChainAsset: Record<string, _MultiChainAsset>,
  MultiChainAssetHashMap: Record<string, string>,
  ChainLogoMap: Record<string, string>,
  AssetLogoMap: Record<string, string>,
  mAssetLogoMap: Record<string, string>
}

export async function fetchPatchData<T> () {
  try {
    const fetchPromise = fetch(`${fetchDomain}/patch/${ChainListVersion}/${fetchFile}`);
    const timeout = new Promise<null>((resolve) => {
      const id = setTimeout(() => {
        clearTimeout(id);
        resolve(null);
      }, 1000);
    });
    const rs = await Promise.race([
      timeout,
      fetchPromise
    ]);

    if (!rs) {
      return null;
    }

    return await rs.json() as T;
  } catch (e) {
    return null;
  }
}
