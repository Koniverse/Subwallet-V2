// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { APP_POPUP_MODAL, EARNING_WARNING_ANNOUNCEMENT } from '@subwallet/extension-koni-ui/constants';
import { toggleCampaignPopup } from '@subwallet/extension-koni-ui/messaging/campaigns';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import { ModalContext } from '@subwallet/react-ui';
import React, { useCallback, useContext, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import AppPopupModal from '../components/Modal/Campaign/AppPopupModal';
import { AppContentButton, PopupFrequency } from '../types/staticContent';

interface MktCampaignModalContextProviderProps {
  children?: React.ReactElement;
}

export type MktCampaignModalInfo = {
  title?: string;
  message?: string;
  buttons?: AppContentButton[];
  externalButtons?: React.ReactElement;
  type?: 'popup' | 'banner' | 'confirmation';
  onClickBtn?: (url?: string) => void;
  repeat?: PopupFrequency;
};

export interface MktCampaignModalType {
  openModal: (data: MktCampaignModalInfo) => void;
  hideModal: () => void;
}

export const MktCampaignModalContext = React.createContext({} as MktCampaignModalType);

export const MktCampaignModalContextProvider = ({ children }: MktCampaignModalContextProviderProps) => {
  const [mktCampaignModal, setMktCampaignModal] = useState<MktCampaignModalInfo | undefined>(undefined);
  const { activeModal, inactiveModal } = useContext(ModalContext);
  const { isPopupVisible } = useSelector((state: RootState) => state.campaign);
  const storageEarningPosition = window.localStorage.getItem(EARNING_WARNING_ANNOUNCEMENT);

  // TODO: This is a hotfix solution; a better solution must be found.
  const openModal = useCallback((data: MktCampaignModalInfo) => {
    if (mktCampaignModal?.type === 'popup') {
      if (isPopupVisible && (!storageEarningPosition || storageEarningPosition.includes('confirmed'))) {
        setMktCampaignModal(data);
        activeModal(APP_POPUP_MODAL);
      }
    } else {
      if (!storageEarningPosition || storageEarningPosition.includes('confirmed')) {
        setMktCampaignModal(data);
        activeModal(APP_POPUP_MODAL);
      }
    }
  }, [activeModal, isPopupVisible, mktCampaignModal?.type, storageEarningPosition]);

  const hideModal = useCallback(() => {
    toggleCampaignPopup({ value: false }).catch((e) => console.error(e)).finally(() => {
      inactiveModal(APP_POPUP_MODAL);
      setMktCampaignModal(undefined);
    });
  }, [inactiveModal]);

  const mktCampaignContextValue = useMemo(() => ({ openModal, hideModal }), [hideModal, openModal]);

  return (
    <MktCampaignModalContext.Provider value={mktCampaignContextValue}>
      {children}
      {mktCampaignModal && (<AppPopupModal
        onCloseModal={hideModal}
        {...mktCampaignModal}
      />)}
    </MktCampaignModalContext.Provider>
  );
};
