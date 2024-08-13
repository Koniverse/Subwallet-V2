// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Theme } from '@subwallet/extension-koni-ui/themes';
import { AccountAddressItemType, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { toShort } from '@subwallet/extension-koni-ui/utils';
import { Icon } from '@subwallet/react-ui';
import CN from 'classnames';
import { CheckCircle } from 'phosphor-react';
import React, { Context, useContext } from 'react';
import styled, { ThemeContext } from 'styled-components';

import AccountProxyAvatar from './AccountProxyAvatar';

type Props = ThemeProps & {
  item: AccountAddressItemType;
  onClick?: VoidFunction;
  isSelected?: boolean;
  showUnselectIcon?: boolean;
}

function Component (props: Props): React.ReactElement<Props> {
  const { className,
    isSelected,
    item, onClick, showUnselectIcon } = props;
  const token = useContext<Theme>(ThemeContext as Context<Theme>).token;

  return (
    <>
      <div
        className={CN(className)}
        onClick={onClick}
      >
        <div className='__item-left-part'>
          <AccountProxyAvatar
            className={'__account-avatar'}
            size={24}
            value={item.accountProxyId}
          />
        </div>

        <div className='__item-center-part'>
          <div className='__account-name'>
            {item.accountName}
          </div>
          <div className='__address'>
            ({toShort(item.address, 4, 5)})
          </div>
        </div>

        <div className='__item-right-part'>
          {(isSelected || showUnselectIcon) && (
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
    </>
  );
}

const AccountAddressItem = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {
    background: token.colorBgSecondary,
    paddingLeft: token.paddingSM,
    paddingRight: token.paddingSM,
    paddingTop: 6,
    paddingBottom: 6,
    borderRadius: token.borderRadiusLG,
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    cursor: 'pointer',
    transition: `background ${token.motionDurationMid} ease-in-out`,
    overflowX: 'hidden',
    minHeight: 52,

    '.__account-avatar': {
      marginRight: token.marginSM
    },

    '.__item-center-part': {
      display: 'flex',
      overflowX: 'hidden',
      'white-space': 'nowrap',
      gap: token.sizeXXS,
      flex: 1,
      fontSize: token.fontSize,
      lineHeight: token.lineHeight
    },

    '.__item-right-part': {
      display: 'flex'
    },

    '.__checked-icon-wrapper': {
      display: 'flex',
      justifyContent: 'center',
      minWidth: 40,
      marginRight: -token.marginXS
    },

    '.__account-name': {
      color: token.colorTextLight1,
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },

    '.__address': {
      color: token.colorTextLight4
    },

    '&:hover': {
      background: token.colorBgInput
    }
  };
});

export default AccountAddressItem;
