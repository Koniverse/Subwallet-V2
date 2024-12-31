// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import { Logo } from '@subwallet/react-ui';
import CN from 'classnames';
import React from 'react';
import styled from 'styled-components';

interface Props extends ThemeProps {
  onClick?: VoidFunction;
  tokenSlug: string;
  tokenSymbol: string;
  chainSlug: string;
  chainName: string;
}

const Component = ({ chainName, chainSlug, className, onClick, tokenSlug, tokenSymbol }: Props) => {
  return (
    <div
      className={CN(className)}
      onClick={onClick}
    >
      <div className='__item-left-part'>
        <Logo
          isShowSubLogo={true}
          shape={'squircle'}
          size={40}
          subLogoShape={'circle'}
          subNetwork={chainSlug}
          token={tokenSlug.toLowerCase()}
        />
      </div>
      <div className='__item-center-part'>
        <div className='__token-symbol'>
          {tokenSymbol}
        </div>
        <div className='__chain-name'>
          {chainName}
        </div>
      </div>
    </div>
  );
};

const TokenSelectorItem = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return ({
    display: 'flex',
    backgroundColor: token.colorBgSecondary,
    borderRadius: token.borderRadiusLG,
    padding: token.paddingSM,
    cursor: 'pointer',
    gap: token.sizeXS,
    transition: `background ${token.motionDurationMid} ease-in-out`,

    '.__item-center-part': {
      overflow: 'hidden',
      flex: 1
    },

    '.__token-symbol': {
      fontSize: token.fontSizeLG,
      lineHeight: token.lineHeightLG,
      color: token.colorTextLight1,
      overflow: 'hidden',
      'white-space': 'nowrap',
      textOverflow: 'ellipsis'
    },

    '.__chain-name': {
      fontSize: token.fontSizeSM,
      lineHeight: token.lineHeightSM,
      color: token.colorTextLight3,
      overflow: 'hidden',
      'white-space': 'nowrap',
      textOverflow: 'ellipsis'
    },

    '&:hover': {
      background: token.colorBgInput
    }
  });
});

export default TokenSelectorItem;
