// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { CHECK_CHAIN_MODAL } from '@subwallet/extension-koni-ui/constants';
import { store } from '@subwallet/extension-koni-ui/stores';
import { ModalContext } from '@subwallet/react-ui';
import { useCallback, useContext } from 'react';

const useOpenUpdateChainModal = (): ((chain: string) => void) => {
  const { activeModal } = useContext(ModalContext);

  return useCallback((chain: string) => {
    activeModal(CHECK_CHAIN_MODAL);
    store.dispatch({ type: 'chainStore/updateCheckChainTarget', payload: chain });
  }, [activeModal]);
};

export default useOpenUpdateChainModal;
