// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { NotificationInfo } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';
import { NotificationStore, ReduxStatus } from '@subwallet/extension-koni-ui/stores/types';

const initialState: NotificationStore = {
  notifications: [],
  reduxStatus: ReduxStatus.INIT,
  unreadNotificationCount: 0
};

const notificationSlice = createSlice({
  initialState,
  name: 'notification',
  reducers: {
    updateNotification (state, action: PayloadAction<NotificationInfo[]>): NotificationStore {
      const payload = action.payload;

      return {
        ...state,
        notifications: payload,
        reduxStatus: ReduxStatus.READY
      };
    },
    updateUnreadNotificationCount (state, action: PayloadAction<number>): NotificationStore {
      return {
        ...state,
        unreadNotificationCount: action.payload,
        reduxStatus: ReduxStatus.READY
      };
    }
  }
});

export const { updateNotification, updateUnreadNotificationCount } = notificationSlice.actions;
export default notificationSlice.reducer;
