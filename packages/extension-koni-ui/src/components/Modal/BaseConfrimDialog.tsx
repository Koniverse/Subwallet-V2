// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ScreenContext } from '@subwallet/extension-koni-ui/contexts/ScreenContext';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import SwConfirmDialog, { SwConfirmDialogProps } from "@subwallet/react-ui/es/sw-modal/SwConfirmDialog";
import CN from 'classnames';
import React, { useContext } from 'react';
import styled from 'styled-components';

type Props = ThemeProps & SwConfirmDialogProps & {
  fullSize?: boolean;
};

function Component ({ children, className, fullSize, motion, ...props }: Props): React.ReactElement<Props> {
  const { isWebUI } = useContext(ScreenContext);
  const width = isWebUI ? '390px' : '100%'

  return (
    <SwConfirmDialog
      {...props}
      className={CN(className, {
        '-mobile': !isWebUI,
        '-full-Size': fullSize
      })}
      width={width}
    />
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const BaseConfirmDialog = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return ({
    '.ant-sw-modal-content.ant-sw-modal-content': {
      width: '100%'
    },
    '&.-mobile': {
      justifyContent: 'flex-end',

      '.ant-sw-modal-content': {
        maxHeight: '95%'
      }
    },

    '&.-full-Size': {
      '.ant-sw-modal-content': {
        height: '100%',
        maxHeight: '100%',
        borderRadius: 0
      }
    }
  });
});
