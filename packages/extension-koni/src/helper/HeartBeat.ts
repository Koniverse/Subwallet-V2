// Copyright 2019-2022 @polkadot/extension authors & contributors
// SPDX-License-Identifier: Apache-2.0

// These code from https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers#keep-sw-alive

import { isFirefox } from '@subwallet/extension-base/utils';

/**
 * Tracks when a service worker was last alive and extends the service worker
 * lifetime by writing the current time to extension storage every 20 seconds.
 * You should still prepare for unexpected termination - for example, if the
 * extension process crashes or your extension is manually stopped at
 * chrome://serviceworker-internals.
 */

let heartbeatInterval: NodeJS.Timer | undefined;

async function runHeartbeat (cb: () => Promise<void>) {
  if (isFirefox) {
    await chrome.alarms.create('keep-loaded-alarm', {
      periodInMinutes: 0.3
    });

    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'keep-loaded-alarm') {
        cb().catch(() => console.error('Failed to load alarms'));
      }
    });
  } else {
    await cb();
  }
}

/**
 * Starts the heartbeat interval which keeps the service worker alive. Call
 * this sparingly when you are doing work which requires persistence, and call
 * stopHeartbeat once that work is complete.
 */
export function startHeartbeat (cb: () => Promise<void>) {
  // Run the heartbeat once at service worker startup.
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  runHeartbeat(cb).then(() => {
    if (!isFirefox) {
      heartbeatInterval = setInterval(() => {
        runHeartbeat(cb).catch(console.error);
      }, 20 * 1000);
    }
  }).catch(console.error);
}

export function stopHeartbeat () {
  if (isFirefox) {
    chrome.alarms.clear('keep-loaded-alarm', function (wasCleared) {
      if (wasCleared) {
        console.log('Alarm was cleared');
      }
    });
  } else {
    clearInterval(heartbeatInterval);
  }

  heartbeatInterval = undefined;
}

/**
 * Returns the last heartbeat stored in extension storage, or undefined if
 * the heartbeat has never run before.
 */
export async function getLastHeartbeat () {
  return (await chrome.storage.local.get('last-heartbeat'))['last-heartbeat'] as number | undefined;
}
