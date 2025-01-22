// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ConfirmationsQueue, ConfirmationsQueueCardano, ConfirmationsQueueTon } from '@subwallet/extension-base/background/KoniTypes';
import { AuthorizeRequest, ConfirmationRequestBase, MetadataRequest, SigningRequest } from '@subwallet/extension-base/background/types';
import { SWTransactionResult } from '@subwallet/extension-base/services/transaction-service/types';
import { WalletConnectNotSupportRequest, WalletConnectSessionRequest } from '@subwallet/extension-base/services/wallet-connect-service/types';
import { ReduxStatus, RequestState } from '@subwallet/extension-koni-ui/stores/types';

const initialState: RequestState = {
  authorizeRequest: {},
  metadataRequest: {},
  signingRequest: {},
  transactionRequest: {},

  // WalletConnect
  connectWCRequest: {},
  notSupportWCRequest: {},

  // Type of confirmation requets
  addNetworkRequest: {},
  addTokenRequest: {},
  evmSignatureRequest: {},
  evmSendTransactionRequest: {},
  evmWatchTransactionRequest: {},
  errorConnectNetwork: {},

  tonSignatureRequest: {},
  tonSendTransactionRequest: {},
  tonWatchTransactionRequest: {},

  cardanoSignatureRequest: {},
  cardanoSendTransactionRequest: {},
  cardanoWatchTransactionRequest: {},

  // Summary Info
  reduxStatus: ReduxStatus.INIT,
  hasConfirmations: false,
  hasInternalConfirmations: false,
  numberOfConfirmations: 0
};

export const CONFIRMATIONS_FIELDS: Array<keyof RequestState> = [
  'authorizeRequest',
  'metadataRequest',
  'signingRequest',
  'addNetworkRequest',
  'addTokenRequest',
  'evmSignatureRequest',
  'evmSendTransactionRequest',
  'evmWatchTransactionRequest',
  'errorConnectNetwork',
  'tonSignatureRequest',
  'tonSendTransactionRequest',
  'tonWatchTransactionRequest',
  'cardanoSignatureRequest',
  'cardanoSendTransactionRequest',
  'tonWatchTransactionRequest',
  'connectWCRequest',
  'notSupportWCRequest'
];

export interface ConfirmationQueueItem {
  type: ConfirmationType;
  item: ConfirmationRequestBase;
}

export type ConfirmationType = typeof CONFIRMATIONS_FIELDS[number];

const readyMap = {
  updateAuthorizeRequests: false,
  updateMetadataRequests: false,
  updateSigningRequests: false,
  updateConfirmationRequests: false,
  updateConfirmationRequestsTon: false,
  updateConfirmationRequestCardano: false,
  updateConnectWalletConnect: false,
  updateNotSupportWalletConnect: false
};

function computeStateSummary (state: RequestState) {
  let numberOfConfirmations = 0;

  state.hasInternalConfirmations = false;
  CONFIRMATIONS_FIELDS.forEach((field) => {
    const confirmationList = Object.values(state[field]);

    numberOfConfirmations += confirmationList.length;

    if (!state.hasInternalConfirmations && confirmationList.some((x: ConfirmationRequestBase) => x.isInternal)) {
      state.hasInternalConfirmations = true;
    }
  }, 0);

  state.numberOfConfirmations = numberOfConfirmations;
  state.hasConfirmations = numberOfConfirmations > 0;

  if (Object.values(readyMap).every((v) => v)) {
    state.reduxStatus = ReduxStatus.READY;
  }
}

const requestStateSlice = createSlice({
  initialState,
  name: 'requestState',
  reducers: {
    updateAuthorizeRequests (state, { payload }: PayloadAction<Record<string, AuthorizeRequest>>) {
      state.authorizeRequest = payload;
      readyMap.updateAuthorizeRequests = true;
      computeStateSummary(state as RequestState);
    },
    updateMetadataRequests (state, { payload }: PayloadAction<Record<string, MetadataRequest>>) {
      state.metadataRequest = payload;
      readyMap.updateMetadataRequests = true;
      computeStateSummary(state as RequestState);
    },
    updateSigningRequests (state, { payload }: PayloadAction<Record<string, SigningRequest>>) {
      state.signingRequest = payload;
      readyMap.updateSigningRequests = true;
      computeStateSummary(state as RequestState);
    },
    updateConfirmationRequests (state, action: PayloadAction<Partial<ConfirmationsQueue>>) {
      Object.assign(state, action.payload);
      readyMap.updateConfirmationRequests = true;
      computeStateSummary(state as RequestState);
    },
    updateTransactionRequests (state, { payload }: PayloadAction<Record<string, SWTransactionResult>>) {
      state.transactionRequest = payload;
    },
    updateConnectWCRequests (state, { payload }: PayloadAction<Record<string, WalletConnectSessionRequest>>) {
      state.connectWCRequest = payload;
      readyMap.updateConnectWalletConnect = true;
      computeStateSummary(state as RequestState);
    },
    updateConfirmationRequestsTon (state, action: PayloadAction<Partial<ConfirmationsQueueTon>>) {
      Object.assign(state, action.payload);
      readyMap.updateConfirmationRequestsTon = true;
      computeStateSummary(state as RequestState);
    },
    updateConfirmationRequestsCardano (state, action: PayloadAction<Partial<ConfirmationsQueueCardano>>) {
      Object.assign(state, action.payload);
      readyMap.updateConfirmationRequestCardano = true;
      computeStateSummary(state as RequestState);
    },
    updateWCNotSupportRequests (state, { payload }: PayloadAction<Record<string, WalletConnectNotSupportRequest>>) {
      state.notSupportWCRequest = payload;
      readyMap.updateNotSupportWalletConnect = true;
      computeStateSummary(state as RequestState);
    }
  }
});

export const { updateAuthorizeRequests, updateConfirmationRequests, updateMetadataRequests, updateSigningRequests } = requestStateSlice.actions;
export default requestStateSlice.reducer;
