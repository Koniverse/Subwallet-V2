// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { _NotificationInfo } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';
import { NotificationStore, ReduxStatus } from '@subwallet/extension-koni-ui/stores/types';

const initialState: NotificationStore = {
  reduxStatus: ReduxStatus.INIT,
  unreadNotificationCountMap: {}
};

const notificationSlice = createSlice({
  initialState,
  name: 'notification',
  reducers: {
    updateUnreadNotificationCountMap (state, action: PayloadAction<Record<string, number>>): NotificationStore {
      return {
        ...state,
        unreadNotificationCountMap: action.payload,
        reduxStatus: ReduxStatus.READY
      };
    }
  }
});

export const { updateUnreadNotificationCountMap } = notificationSlice.actions;
export default notificationSlice.reducer;
