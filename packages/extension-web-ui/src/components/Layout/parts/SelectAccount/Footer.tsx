// Copyright 2019-2022 @subwallet/extension-web-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { DISCONNECT_EXTENSION_MODAL, SELECT_EXTENSION_MODAL } from '@subwallet/extension-web-ui/constants';
import { InjectContext } from '@subwallet/extension-web-ui/contexts/InjectContext';
import { useTranslation } from '@subwallet/extension-web-ui/hooks';
import { ThemeProps } from '@subwallet/extension-web-ui/types';
import { Button, Icon, ModalContext } from '@subwallet/react-ui';
import { PuzzlePiece } from 'phosphor-react';
import React, { useCallback, useContext } from 'react';
import styled from 'styled-components';

type Props = ThemeProps;

const Component: React.FC<Props> = ({ className }: Props) => {
  const { t } = useTranslation();
  const { activeModal } = useContext(ModalContext);
  const { enabled, injected, loadingInject } = useContext(InjectContext);

  const onClickExtension = useCallback(() => {
    if (enabled) {
      activeModal(DISCONNECT_EXTENSION_MODAL);
    } else {
      activeModal(SELECT_EXTENSION_MODAL);
    }
  }, [activeModal, enabled]);

  return (
    <div className={className}>
      <Button
        className='btn-full-width'
        icon={(
          <Icon
            phosphorIcon={PuzzlePiece}
            weight={'fill'}
          />
        )}
        loading={loadingInject}
        onClick={onClickExtension}
        schema={ (enabled && !loadingInject) ? 'danger' : 'secondary'}
        tooltip={(enabled && !loadingInject) ? t('Disconnect extension') : injected ? t('Connect extension') : t('Download extension')}
      >
        {(enabled && !loadingInject) ? t('Disconnect extension') : injected ? t('Connect extension') : t('Download extension')}
      </Button>
    </div>
  );
};

const SelectAccountFooter = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {
    display: 'flex',

    '.btn-full-width': {
      width: '100%'
    }
  };
});

export default SelectAccountFooter;
