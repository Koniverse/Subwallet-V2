// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { useTranslation } from '@subwallet/extension-koni-ui/hooks';
import { Theme } from '@subwallet/extension-koni-ui/themes';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import { Icon } from '@subwallet/react-ui';
import CN from 'classnames';
import { CheckCircle } from 'phosphor-react';
import React, { Context, useContext } from 'react';
import styled, { ThemeContext } from 'styled-components';

import AccountProxyAvatarGroup, { BasicAccountProxyInfo } from './AccountProxyAvatarGroup';

type Props = ThemeProps & {
  isSelected?: boolean;
  onClick?: VoidFunction;
  showUnSelectedIcon?: boolean;
  accountProxies?: BasicAccountProxyInfo[];
};

function Component (props: Props): React.ReactElement<Props> {
  const { accountProxies, className, isSelected, onClick, showUnSelectedIcon } = props;
  const { t } = useTranslation();

  const token = useContext<Theme>(ThemeContext as Context<Theme>).token;

  return (
    <div
      className={CN(className)}
      onClick={onClick}
    >
      <div className='__item-left-part'>
        <AccountProxyAvatarGroup accountProxies={ accountProxies } />
      </div>
      <div className='__item-middle-part'>
        {t('All accounts')}
      </div>
      <div className='__item-right-part'>
        {(showUnSelectedIcon || isSelected) && (
          <div className='__checked-icon-wrapper'>
            <Icon
              iconColor={isSelected ? token.colorSuccess : token.colorTextLight4}
              phosphorIcon={CheckCircle}
              size='sm'
              weight='fill'
            />
          </div>
        )}
      </div>
    </div>
  );
}

const AccountProxySelectorAllItem = styled(Component)<Props>(({ theme }) => {
  const { token } = theme as Theme;

  return {
    height: 52,
    background: token.colorBgSecondary,
    padding: token.paddingSM,
    paddingRight: token.paddingXXS,
    borderRadius: token.borderRadiusLG,
    alignItems: 'center',
    display: 'flex',
    cursor: 'pointer',
    transition: `background ${token.motionDurationMid} ease-in-out`,
    gap: token.sizeXS,

    '.__item-left-part': {

    },

    '.__item-middle-part': {
      flex: 1,
      fontSize: token.fontSizeLG,
      color: token.colorTextLight1,
      lineHeight: token.lineHeightLG,
      textOverflow: 'ellipsis',
      overflow: 'hidden',
      'white-space': 'nowrap'
    },

    '.__checked-icon-wrapper': {
      display: 'flex',
      justifyContent: 'center',
      minWidth: 40
    },

    '&:hover': {
      background: token.colorBgInput,
      '.__item-actions-overlay': {
        opacity: 0
      },
      '.-show-on-hover': {
        opacity: 1
      }
    }
  };
});

export default AccountProxySelectorAllItem;
