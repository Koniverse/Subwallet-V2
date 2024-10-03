// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { NotificationInfo } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';
import { GetNotificationCountResult } from '@subwallet/extension-base/types/notification';
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
    updateNotifications (state, action: PayloadAction<NotificationInfo[]>): NotificationStore {
      const payload = action.payload;

      return {
        ...state,
        notifications: payload,
        reduxStatus: ReduxStatus.READY
      };
    },
    updateUnreadNotificationCount (state, action: PayloadAction<GetNotificationCountResult>): NotificationStore {
      return {
        ...state,
        unreadNotificationCount: action.payload.count,
        reduxStatus: ReduxStatus.READY
      };
    }
  }
});

export const { updateNotifications, updateUnreadNotificationCount } = notificationSlice.actions;
export default notificationSlice.reducer;
