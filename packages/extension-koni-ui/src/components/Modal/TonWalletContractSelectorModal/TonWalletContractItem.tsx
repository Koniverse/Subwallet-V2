// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Theme, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { toShort } from '@subwallet/extension-koni-ui/utils';
import { TonWalletContractVersion } from '@subwallet/keyring/types';
import { Icon, Logo } from '@subwallet/react-ui';
import CN from 'classnames';
import { CheckCircle } from 'phosphor-react';
import React from 'react';
import styled, { useTheme } from 'styled-components';

export type TonWalletContractItemType = {
  version: TonWalletContractVersion,
  address: string,
  isSelected: boolean,
  chainSlug: string
}

type Props = ThemeProps & TonWalletContractItemType & {
  onClick?: VoidFunction;
}

const Component: React.FC<Props> = (props: Props) => {
  const { address, chainSlug, className, isSelected, onClick, version } = props;
  const { token } = useTheme() as Theme;

  return (
    <>
      <div
        className={CN(className, '__item-list-wallet')}
        onClick={onClick}
      >
        <div className='__item-left-part'>
          <Logo
            network={chainSlug}
            shape={'circle'}
            size={28}
          />
        </div>

        <div className='__item-center-part'>
          <div className='__item-chain-name'>
            {version}
          </div>
          <div className='__item-address'>
            {toShort(address, 4, 5)}
          </div>
        </div>

        <div className='__item-right-part'>
          {isSelected && <Icon
            className={'right-item__select-icon'}
            iconColor={isSelected ? token.colorSuccess : token.colorTextLight4}
            phosphorIcon={CheckCircle}
            size={'sm'}
            weight={'fill'}
          />}
        </div>
      </div>
    </>
  );
};

export const TonWalletContractItem = styled(Component)<Props>(({ theme: { token } }: Props) => {
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
    gap: token.sizeXS,
    overflowX: 'hidden',
    minHeight: 52,

    '.__item-center-part': {
      display: 'flex',
      overflowX: 'hidden',
      'white-space': 'nowrap',
      gap: token.sizeXXS,
      flex: 1,
      alignItems: 'baseline'
    },

    '.__item-chain-name': {
      fontSize: token.fontSize,
      lineHeight: token.lineHeight,
      color: token.colorTextLight1,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      fontWeight: token.fontWeightStrong
    },

    '.__item-address': {
      fontSize: token.fontSizeSM,
      lineHeight: token.lineHeightSM,
      color: token.colorTextLight4,
      fontWeight: token.bodyFontWeight
    },

    '.__item-right-part': {
      paddingLeft: 4
    },

    '.-show-on-hover': {
      opacity: 0,
      transition: `opacity ${token.motionDurationMid} ease-in-out`
    },
    '.-hide-on-hover': {
      opacity: 1,
      transition: `opacity ${token.motionDurationMid} ease-in-out`
    },
    '.right-item__select-icon': {
      paddingLeft: token.paddingSM - 2,
      paddingRight: token.paddingSM - 2
    },

    '&:hover': {
      background: token.colorBgInput,
      '.-hide-on-hover': {
        opacity: 0
      },
      '.-show-on-hover': {
        opacity: 1
      }
    }
  };
});
