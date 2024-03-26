// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ThemeProps } from '@subwallet/extension-web-ui/types';
import { Icon, SwIconProps, Tag, Tooltip } from '@subwallet/react-ui';
import CN from 'classnames';
import React, { useCallback } from 'react';
import styled from 'styled-components';
import {useTranslation} from "@subwallet/extension-web-ui/hooks";

export type MenuItemType = {
  label: string;
  value: string;
  icon: SwIconProps['phosphorIcon'];
};

type Props = MenuItemType & ThemeProps & {
  showToolTip: boolean;
  isActivated: boolean;
  onClick: (key: string) => void;
  isComingSoon?: boolean;
};

function Component ({ className = '', icon, isActivated, isComingSoon, label, onClick, showToolTip, value }: Props): React.ReactElement<Props> {
  const { t } = useTranslation();
  const _onClick = useCallback(() => {
    onClick(value);
  }, [value, onClick]);

  return (
    <div
      className={CN(className, {
        '-activated': isActivated
      })}
      onClick={_onClick}
      tabIndex={-1}
    >
      <Icon
        className={'__icon'}
        phosphorIcon={icon}
        weight='fill'
      />
      <div className={'__label'}>
        {label}
        {isComingSoon ? <Tag color='secondary'>{t('SOON')}</Tag> : ''}
      </div>

      {
        showToolTip && (
          <Tooltip
            placement={'right'}
            title={label}
          >
            <div className={'__overlay'}></div>
          </Tooltip>
        )
      }
    </div>
  );
}

export const MenuItem = styled(Component)<Props>(({ theme: { token } }: Props) => {
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
      height: 40,
      width: 40,
      minWidth: 40,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: token.colorTextLight3
    },

    '.__label': {
      fontSize: token.fontSize,
      lineHeight: token.lineHeight,
      fontWeight: token.headingFontWeight,
      marginLeft: token.marginXS,
      color: token.colorTextLight3,
      'white-space': 'nowrap'
    },

    '.ant-tag.ant-tag-secondary': {
      marginLeft: 8,
      color: '#fff',
      backgroundColor: '#384D69'
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
      borderRightColor: token.colorPrimary,

      '.__icon': {
        color: token.colorPrimary
      },

      '.__label': {
        color: token.colorTextLight1
      }
    }
  });
});
