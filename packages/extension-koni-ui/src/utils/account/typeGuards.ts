// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { KeypairType, KeypairTypes, KeyringPair$Json } from '@subwallet/keyring/types';
import { KeyringPairs$Json } from '@subwallet/ui-keyring/types';

export function isKeyringPairs$Json (json: KeyringPair$Json | KeyringPairs$Json): json is KeyringPairs$Json {
  return (json.encoding.content).includes('batch-pkcs8');
}

export function isValidJsonFile (json: KeyringPair$Json | KeyringPairs$Json): boolean {
  if ((json.encoding.content).includes('batch-pkcs8')) { // Multi
    return true;
  } else if ((json.encoding.content).includes('pkcs8')) { // Single
    const [type] = json.encoding.content.filter((type) => type !== 'pkcs8');

    return KeypairTypes.includes(type as KeypairType);
  } else {
    return false;
  }
}
