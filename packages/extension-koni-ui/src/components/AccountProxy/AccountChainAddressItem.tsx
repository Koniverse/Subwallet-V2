// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountChainAddress, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { toShort } from '@subwallet/extension-koni-ui/utils';
import { Button, Icon, Logo } from '@subwallet/react-ui';
import CN from 'classnames';
import { Copy, QrCode } from 'phosphor-react';
import React from 'react';
import styled from 'styled-components';

type Props = ThemeProps & {
  item: AccountChainAddress;
  onClick?: VoidFunction;
  onClickCopyButton?: VoidFunction;
  onClickQrButton?: VoidFunction;
}

function Component (props: Props): React.ReactElement<Props> {
  const { className,
    item,
    onClick, onClickCopyButton, onClickQrButton } = props;

  const _onClickCopyButton: React.MouseEventHandler<HTMLAnchorElement | HTMLButtonElement> = React.useCallback((event) => {
    event.stopPropagation();
    onClickCopyButton?.();
  }, [onClickCopyButton]);

  const _onClickQrButton: React.MouseEventHandler<HTMLAnchorElement | HTMLButtonElement> = React.useCallback((event) => {
    event.stopPropagation();
    onClickQrButton?.();
  }, [onClickQrButton]);

  return (
    <>
      <div
        className={CN(className)}
        onClick={onClick}
      >
        <div className='__item-left-part'>
          <Logo
            network={item.slug}
            shape={'circle'}
            size={28}
          />
        </div>

        <div className='__item-center-part'>
          <div className='__item-chain-name'>
            {item.name}
          </div>
          <div className='__item-address'>
            {toShort(item.address, 4, 5)}
          </div>
        </div>

        <div className='__item-right-part'>
          <Button
            icon={
              <Icon
                phosphorIcon={QrCode}
                size='sm'
              />
            }
            onClick={_onClickQrButton}
            size='xs'
            type='ghost'
          />
          <Button
            icon={
              <Icon
                phosphorIcon={Copy}
                size='sm'
              />
            }
            onClick={_onClickCopyButton}
            size='xs'
            type='ghost'
          />
        </div>
      </div>
    </>
  );
}

const AccountChainAddressItem = styled(Component)<Props>(({ theme: { token } }: Props) => {
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
      alignItems: 'flex-end'
    },

    '.__item-chain-name': {
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

    '.__item-right-part': {
      display: 'flex'

    },

    '.-show-on-hover': {
      opacity: 0,
      transition: `opacity ${token.motionDurationMid} ease-in-out`
    },
    '.-hide-on-hover': {
      opacity: 1,
      transition: `opacity ${token.motionDurationMid} ease-in-out`
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

export default AccountChainAddressItem;
