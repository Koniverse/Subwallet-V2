// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountProxyAvatar } from '@subwallet/extension-koni-ui/components';
import { Theme } from '@subwallet/extension-koni-ui/themes';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import { getChainTypeLogoMap } from '@subwallet/extension-koni-ui/utils';
import React, { Context, useContext, useMemo } from 'react';
import styled, { ThemeContext } from 'styled-components';

export type ResultAccountProxyItemType = {
  accountName: string;
  accountProxyId: string;
};

type Props = ThemeProps & ResultAccountProxyItemType;

function Component ({ accountName,
  accountProxyId,
  className }: Props) {
  const logoMap = useContext<Theme>(ThemeContext as Context<Theme>).logoMap;

  const chainTypeLogos = useMemo(() => {
    return Object.values(getChainTypeLogoMap(logoMap));
  }, [logoMap]);

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

      <div className='__item-chain-type-logos'>
        {
          chainTypeLogos.map((cts) => (
            <img
              alt='Network type'
              className={'__item-chain-type-logo'}
              key={cts}
              src={cts}
            />
          ))
        }
      </div>
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
      display: 'flex'
    },

    '.__item-chain-type-logo': {
      display: 'block',
      width: token.size,
      height: token.size,
      backfaceVisibility: 'hidden',
      borderRadius: '100%',
      boxShadow: '-4px 0px 4px 0px rgba(0, 0, 0, 0.40)'
    },

    '.__item-chain-type-logo + .__item-chain-type-logo': {
      marginLeft: -token.marginXXS
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
