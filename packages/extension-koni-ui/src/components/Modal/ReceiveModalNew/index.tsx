// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ReceiveModalProps } from '@subwallet/extension-koni-ui/types';
import React from 'react';

import { AccountSelectorModal } from './parts/AccountSelector';
import { TokenSelectorModal } from './parts/TokenSelector';

const ReceiveModal = ({ accountSelectorItems,
  onBackAccountSelector,
  onCloseAccountSelector,
  onCloseTokenSelector,
  onSelectAccountSelector,
  onSelectTokenSelector,
  tokenSelectorItems }: ReceiveModalProps): React.ReactElement<ReceiveModalProps> => {
  return (
    <>
      <TokenSelectorModal
        items={tokenSelectorItems}
        onCancel={onCloseTokenSelector}
        onSelectItem={onSelectTokenSelector}
      />
      <AccountSelectorModal
        items={accountSelectorItems}
        onBack={onBackAccountSelector}
        onCancel={onCloseAccountSelector}
        onSelectItem={onSelectAccountSelector}
      />
    </>
  );
};

export default ReceiveModal;
