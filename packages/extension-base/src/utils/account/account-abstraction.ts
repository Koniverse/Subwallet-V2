// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AAProvider } from '@subwallet/extension-base/types';

export const genProviderConfigKey = (provider: AAProvider, service: string, version: string): string => `${provider}___${service}___${version}`;
