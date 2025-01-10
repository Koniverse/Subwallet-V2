// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { SoloAccountToBeMigrated } from '@subwallet/extension-base/background/KoniTypes';
import { AccountProxyAvatar } from '@subwallet/extension-koni-ui/components';
import { Theme } from '@subwallet/extension-koni-ui/themes';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import { getChainTypeLogoMap, toShort } from '@subwallet/extension-koni-ui/utils';
import React, { Context, useContext, useMemo } from 'react';
import styled, { ThemeContext } from 'styled-components';

type Props = ThemeProps & SoloAccountToBeMigrated;

function Component ({ address,
  chainType,
  className,
  name,
  proxyId }: Props) {
  const logoMap = useContext<Theme>(ThemeContext as Context<Theme>).logoMap;

  const chainTypeLogoMap = useMemo(() => {
    return getChainTypeLogoMap(logoMap);
  }, [logoMap]);

  return (
    <div className={className}>
      <div className='__item-left-part'>

        <div className='__item-account-avatar-wrapper'>
          <AccountProxyAvatar
            className={'__item-account-avatar'}
            size={28}
            value={proxyId}
          />

          <img
            alt='Network type'
            className={'__item-chain-type-logo'}
            src={chainTypeLogoMap[chainType]}
          />
        </div>
      </div>

      <div className='__item-center-part'>
        <div className='__item-account-name'>
          {name}
        </div>

        <div className='__item-account-address'>
          {toShort(address, 4, 5)}
        </div>
      </div>
    </div>
  );
}

export const SoloAccountToBeMigratedItem = styled(Component)<Props>(({ theme: { extendToken, token } }: Props) => {
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
    gap: 5,
    'white-space': 'nowrap',

    '.__item-account-avatar-wrapper': {
      position: 'relative'
    },

    '.__item-chain-type-logo': {
      position: 'absolute',
      right: 0,
      bottom: 0,
      display: 'block',
      width: token.size,
      height: token.size
    },

    '.__item-center-part': {
      display: 'flex',
      overflow: 'hidden',
      alignItems: 'flex-end',
      gap: 5
    },

    '.__item-account-name': {
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
