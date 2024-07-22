// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AddressBookInfo, KeyringState } from '@subwallet/extension-base/background/KoniTypes';
import { AccountsContext } from '@subwallet/extension-base/background/types';
import { AccountJson } from '@subwallet/extension-base/types';
import { AccountState, ReduxStatus } from '@subwallet/extension-koni-ui/stores/types';
import { isAccountAll } from '@subwallet/extension-koni-ui/utils';

const initialState: AccountState = {
  // CurrentAccount
  currentAccount: null,
  isAllAccount: false,

  // KeyringState
  isReady: false,
  hasMasterPassword: false,
  isLocked: true,

  // AccountsContext
  accounts: [],
  contacts: [],
  hierarchy: [],
  recent: [],
  master: undefined,

  reduxStatus: ReduxStatus.INIT
};

const accountStateSlice = createSlice({
  initialState,
  name: 'accountState',
  reducers: {
    updateKeyringState (state, action: PayloadAction<KeyringState>) {
      const payload = action.payload;

      return {
        ...state,
        ...payload,
        reduxStatus: ReduxStatus.READY
      };
    },
    updateAccountsContext (state, action: PayloadAction<AccountsContext>) {
      const payload = action.payload;

      return {
        ...state,
        ...payload,
        reduxStatus: ReduxStatus.READY
      };
    },
    updateCurrentAccount (state, action: PayloadAction<AccountJson>) {
      const payload = action.payload;

      return {
        ...state,
        currentAccount: payload,
        isAllAccount: isAccountAll(payload?.address),
        reduxStatus: ReduxStatus.READY
      };
    },
    updateAddressBook (state, action: PayloadAction<AddressBookInfo>) {
      const { addresses } = action.payload;

      const contacts = addresses.filter((value) => !value.isRecent);
      const recent = addresses.filter((value) => value.isRecent);

      return {
        ...state,
        contacts: contacts,
        recent: recent,
        reduxStatus: ReduxStatus.READY
      };
    }
  }
});

export const { updateAccountsContext, updateCurrentAccount, updateKeyringState } = accountStateSlice.actions;
export default accountStateSlice.reducer;
