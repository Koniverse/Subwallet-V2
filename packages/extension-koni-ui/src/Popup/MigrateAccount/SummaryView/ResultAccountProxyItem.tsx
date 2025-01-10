// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountChainType, SUPPORTED_ACCOUNT_CHAIN_TYPES } from '@subwallet/extension-base/types';
import { AccountChainTypeLogos, AccountProxyAvatar } from '@subwallet/extension-koni-ui/components';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import React from 'react';
import styled from 'styled-components';

export type ResultAccountProxyItemType = {
  accountName: string;
  accountProxyId: string;
};

type Props = ThemeProps & ResultAccountProxyItemType;

function Component ({ accountName,
  accountProxyId,
  className }: Props) {
  return (
    <div className={className}>
      <div className='__item-account-avatar-wrapper'>
        <AccountProxyAvatar
          className={'__item-account-avatar'}
          size={24}
          value={accountProxyId}
        />
      </div>

      <div className='__item-account-name'>
        {accountName}
      </div>

      <AccountChainTypeLogos
        chainTypes={SUPPORTED_ACCOUNT_CHAIN_TYPES as AccountChainType[]}
        className={'__item-chain-type-logos'}
      />
    </div>
  );
}

export const ResultAccountProxyItem = styled(Component)<Props>(({ theme: { extendToken, token } }: Props) => {
  return ({
    minHeight: 52,
    background: token.colorBgSecondary,
    paddingLeft: token.paddingSM,
    paddingRight: token.paddingSM,
    paddingTop: token.paddingXS,
    paddingBottom: token.paddingXS,
    borderRadius: token.borderRadiusLG,
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    transition: `background ${token.motionDurationMid} ease-in-out`,
    gap: token.sizeSM,
    'white-space': 'nowrap',

    '.__item-account-avatar-wrapper': {
      position: 'relative'
    },

    '.__item-chain-type-logos': {

    },

    '.__item-account-name': {
      flex: 1,
      fontSize: token.fontSize,
      color: token.colorTextLight1,
      lineHeight: token.lineHeight,
      fontWeight: token.headingFontWeight,
      textOverflow: 'ellipsis',
      overflow: 'hidden',
      flexShrink: 1
    },

    '.__item-account-address': {
      fontSize: token.fontSizeSM,
      color: token.colorTextLight4,
      lineHeight: 1.5
    }
  });
});
