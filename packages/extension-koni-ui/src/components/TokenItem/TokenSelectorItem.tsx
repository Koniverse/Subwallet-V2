// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import CN from 'classnames';
import React from 'react';
import styled from 'styled-components';

interface Props extends ThemeProps {
  onClick?: VoidFunction;
  tokenSlug?: string;
  tokenSymbol: string;
  networkSlug?: string;
  networkName?: string;
}

const Component = ({ className, onClick, tokenSymbol }: Props) => {
  return (
    <div
      className={CN(className)}
      onClick={onClick}
    >
      <div className='__item-left-part'></div>
      <div className='__item-center-part'>
        <div className='__token-symbol'>
          {tokenSymbol}
        </div>
        <div className='__network-name'>

        </div>
      </div>
      <div className='__item-right-part'></div>
    </div>
  );
};

const TokenSelectorItem = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return ({
    display: 'flex',
    backgroundColor: token.colorBgSecondary,
    borderRadius: token.borderRadiusLG,
    padding: token.paddingSM,
    cursor: 'pointer'
  });
});

export default TokenSelectorItem;
