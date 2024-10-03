// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { HeaderItemType } from '@subwallet/extension-web-ui/components/Layout/base/BaseWeb';
import { ThemeProps } from '@subwallet/extension-web-ui/types';
import { Icon } from '@subwallet/react-ui';
import CN from 'classnames';
import React, { useCallback } from 'react';
import styled from 'styled-components';

type Props = HeaderItemType & ThemeProps & {
  isActivated: boolean;
  onClick: (key: string) => void;
  disabled: boolean
};

function Component ({ className = '', disabled, icon, isActivated, label, onClick, value }: Props): React.ReactElement<Props> {
  const _onClick = useCallback(() => {
    if (disabled) {
      return;
    }

    onClick(value);
  }, [value, onClick, disabled]);

  return (
    <div
      className={CN(className, {
        '-activated': isActivated,
        '-disabled': disabled
      })}
      onClick={_onClick}
      tabIndex={-1}
    >

      <Icon
        className={'__icon'}
        customSize={'16px'}
        weight={'fill'}
        {...icon}
      />

      <div className={'__label'}>
        {label}
      </div>
    </div>
  );
}

export const BlockHeaderItem = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return ({
    borderRight: '4px solid transparent',
    margin: 0,
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    height: 52,
    paddingLeft: token.padding,
    paddingRight: token.padding,
    position: 'relative',

    '.__overlay': {
      position: 'absolute',
      top: 0,
      left: 0,
      right: -4,
      bottom: 0,
      zIndex: 2
    },

    '.__icon': {
      fontSize: 24,
      height: 16,
      width: 16,
      minWidth: 16,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: token.colorTextLight3
    },

    '.__label': {
      fontSize: token.fontSizeLG,
      lineHeight: token.lineHeightLG,
      fontWeight: token.fontWeightStrong,
      marginLeft: token.marginXXS,
      color: token.colorTextSecondary,
      'white-space': 'nowrap',
      transition: 'color 0.3s'
    },

    '.ant-image': {
      maxWidth: 16,
      maxHeight: 16
    },

    '&:hover': {
      backgroundColor: token.colorBgInput
    },

    '&:not(.-activated):hover': {
      '.__icon': {
        color: token.colorTextLight1
      },

      '.__label': {
        color: token.colorTextLight1
      }
    },

    '&.-activated': {

      '.__icon': {
        color: token.colorTextLight1
      },

      '.__label': {
        color: token.colorTextLight1
      }
    },

    '&.-disabled': {
      opacity: token.opacityDisable,
      cursor: 'not-allowed'
    }
  });
});
