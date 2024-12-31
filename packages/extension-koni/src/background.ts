// Copyright 2019-2022 @polkadot/extension authors & contributors
// SPDX-License-Identifier: Apache-2.0

// Runs in the extension background, handling all keyring access
import '@subwallet/extension-inject/crossenv';

import { APP_ENV, APP_VER, EnvConfig } from '@subwallet/extension-base/constants';
import { SWHandler } from '@subwallet/extension-base/koni/background/handlers';
import { AccountsStore } from '@subwallet/extension-base/stores';
import KeyringStore from '@subwallet/extension-base/stores/Keyring';
import { browserName, browserVersion, osName, osVersion } from '@subwallet/extension-base/utils';
import { ActionHandler } from '@subwallet/extension-koni/helper/ActionHandler';
import keyring from '@subwallet/ui-keyring';

import { cryptoWaitReady } from '@polkadot/util-crypto';

// Set handler
const actionHandler = ActionHandler.instance;

actionHandler.setHandler(SWHandler.instance);

globalThis.window = globalThis.self;

cryptoWaitReady()
  .then((): void => {
    const koniState = SWHandler.instance.state;

    // setTimeout(() => koniState.onCheckToRemindUser(), 4000);

    const envConfig: EnvConfig = {
      appConfig: {
        environment: APP_ENV,
        version: APP_VER
      },
      browserConfig: {
        type: browserName,
        version: browserVersion
      },
      osConfig: {
        type: osName,
        version: osVersion
      }
    };

    koniState.initEnvConfig(envConfig);

    // load all the keyring data
    keyring.loadAll({ store: new AccountsStore(), type: 'sr25519', password_store: new KeyringStore() });

    keyring.restoreKeyringPassword().finally(() => {
      koniState.updateKeyringState();
    });
    koniState.eventService.emit('crypto.ready', true);

    // Manual Init koniState
    actionHandler.waitFirstActiveMessage.then(() => {
      koniState.init().catch(console.error);
    }).catch(console.error);
  })
  .catch((error): void => {
    console.error('Initialization fail', error);
  });
