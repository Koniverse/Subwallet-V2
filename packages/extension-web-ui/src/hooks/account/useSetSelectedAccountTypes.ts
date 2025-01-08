// Copyright 2019-2022 @subwallet/extension-web-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { DEFAULT_ACCOUNT_TYPES, SEED_PREVENT_MODAL, SELECTED_ACCOUNT_TYPE } from '@subwallet/extension-web-ui/constants';
import { KeypairType } from '@subwallet/keyring/types';
import { useCallback } from 'react';
import { useLocalStorage } from 'usehooks-ts';

// todo: deprecated, need recheck all usages
const useSetSelectedAccountTypes = (preventModal: boolean) => {
  const [, setTypesStorage] = useLocalStorage(SELECTED_ACCOUNT_TYPE, DEFAULT_ACCOUNT_TYPES);
  const [, setPreventModalStorage] = useLocalStorage(SEED_PREVENT_MODAL, preventModal);

  return useCallback((values: KeypairType[]) => {
    setTypesStorage(values);
    setPreventModalStorage(preventModal);
  }, [preventModal, setPreventModalStorage, setTypesStorage]);
};

export default useSetSelectedAccountTypes;
