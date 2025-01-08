// Copyright 2019-2022 @subwallet/extension-web-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { MnemonicType } from '@subwallet/extension-base/types';
import { DEFAULT_MNEMONIC_TYPE, SEED_PREVENT_MODAL, SELECTED_MNEMONIC_TYPE } from '@subwallet/extension-web-ui/constants';
import { useCallback } from 'react';
import { useLocalStorage } from 'usehooks-ts';

const useSetSelectedMnemonicType = (preventModal: boolean) => {
  const [, setTypesStorage] = useLocalStorage(SELECTED_MNEMONIC_TYPE, DEFAULT_MNEMONIC_TYPE);
  const [, setPreventModalStorage] = useLocalStorage(SEED_PREVENT_MODAL, preventModal);

  return useCallback((values: MnemonicType) => {
    setTypesStorage(values);
    setPreventModalStorage(preventModal);
  }, [preventModal, setPreventModalStorage, setTypesStorage]);
};

export default useSetSelectedMnemonicType;
