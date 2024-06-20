// Copyright 2017-2022 @polkadot/react-components authors & contributors
// SPDX-License-Identifier: Apache-2.0

import languageCache from './cache';

type Callback = (error: string | null, data: unknown) => void;

type LoadResult = [string | null, Record<string, string> | boolean];

const loaders: Record<string, Promise<LoadResult>> = {};

const languageCacheOnline: Record<string, Record<string, string>> = {};
const mergedLanguageCache: Record<string, Record<string, string>> = {};

const PRODUCTION_BRANCHES = ['master', 'webapp', 'webapp-dev'];
const PROJECT_ID = '5dcb4a73-9e30-4220-b578-2a1aab0dfff5';
const branchName = process.env.BRANCH_NAME || 'koni-dev';
const envTarget = PRODUCTION_BRANCHES.indexOf(branchName) > -1 ? 'prod' : 'dev';
const fetchTarget = PRODUCTION_BRANCHES.indexOf(branchName) > -1 ? 'https://subwallet-static-content.pages.dev' : 'https://sw-static-data-dev.pages.dev';
const fetchFile = `${fetchTarget}/localization-contents/${PROJECT_ID}/${envTarget}`;

export default class Backend {
  type = 'backend';

  static type: 'backend' = 'backend';

  async read (lng: string, _namespace: string, responder: Callback): Promise<void> {
    if (languageCache[lng]) {
      return responder(null, languageCache[lng]);
    }

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    if (!loaders[lng]) {
      loaders[lng] = this.createLoader(lng);
    }

    const [error, data] = await loaders[lng];

    return responder(error, data);
  }

  async createLoader (lng: string): Promise<LoadResult> {
    try {
      const responseOnline = await fetch(`${fetchFile}/${lng}.json`);
      const response = await fetch(`locales/${lng}/translation.json`);
      // TODO: this URL is temporary for testing

      if (!responseOnline.ok && !response.ok) {
        return [`i18n: failed loading ${lng}`, response.status >= 500 && response.status < 600];
      }

      if (response.ok) {
        languageCache[lng] = await response.json() as Record<string, string>;
      }

      if (responseOnline.ok) {
        languageCacheOnline[lng] = await responseOnline.json() as Record<string, string>;
      }

      mergedLanguageCache[lng] = { ...languageCache[lng], ...languageCacheOnline[lng] };

      return [null, mergedLanguageCache[lng]];
    } catch (error) {
      return [(error as Error).message, false];
    }
  }
}
