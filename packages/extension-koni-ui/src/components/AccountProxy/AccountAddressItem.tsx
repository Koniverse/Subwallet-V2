// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountAddressItemType, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { toShort } from '@subwallet/extension-koni-ui/utils';
import CN from 'classnames';
import React from 'react';
import styled from 'styled-components';

type Props = ThemeProps & {
  item: AccountAddressItemType;
  onClick?: VoidFunction;
}

function Component (props: Props): React.ReactElement<Props> {
  const { className,
    item,
    onClick } = props;

  return (
    <>
      <div
        className={CN(className)}
        onClick={onClick}
      >
        <div className='__item-left-part'>

        </div>

        <div className='__item-center-part'>
          <div className='__account-name'>
            {item.accountName}
          </div>
          <div className='__address'>
            ({toShort(item.address, 4, 5)})
          </div>
        </div>
      </div>
    </>
  );
}

const AccountAddressItem = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {
    background: token.colorBgSecondary,
    paddingLeft: token.paddingSM,
    paddingRight: token.paddingXXS,
    paddingTop: 6,
    paddingBottom: 6,
    borderRadius: token.borderRadiusLG,
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    cursor: 'pointer',
    transition: `background ${token.motionDurationMid} ease-in-out`,
    gap: token.sizeXXS,
    overflowX: 'hidden',
    minHeight: 52,

    '.__item-center-part': {
      display: 'flex',
      overflowX: 'hidden',
      'white-space': 'nowrap',
      gap: token.sizeXXS,
      flex: 1,
      alignItems: 'center'
    },

    '.__item-account-name': {
      fontSize: token.fontSize,
      lineHeight: token.lineHeight,
      color: token.colorTextLight1,
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },

    '.__item-address': {
      fontSize: token.fontSizeSM,
      lineHeight: token.lineHeightSM,
      color: token.colorTextLight4
    },

    '&:hover': {
      background: token.colorBgInput
    }
  };
});

export default AccountAddressItem;
