// Copyright 2019-2022 @subwallet/extension-web-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Theme, ThemeProps } from '@subwallet/extension-web-ui/types';
import Avatar from 'boring-avatars';
import CN from 'classnames';
import React from 'react';
import styled, { useTheme } from 'styled-components';

type Props = ThemeProps & {
  value?: string | null,
  size?: number
}

const Component: React.FC<Props> = (props: Props) => {
  const { className, size = 40, value } = props;
  const { logoMap } = useTheme() as Theme;

  return (
    <div
      className={CN(className)}
      style={{ width: size, height: size, minWidth: size, borderWidth: size * 0.05 }}
    >
      {
        value
          ? (
            <Avatar
              colors={['#004BFF', '#4CEAAC', '#0C0C0C', '#1A1A1A', '#FFFFFF']}
              name={value}
              size={size * 0.7}
              variant='bauhaus'
            />
          )
          : (
            <img
              alt='logo'
              height={size * 0.7}
              src={logoMap.symbol.avatar_placeholder as string}
              width={size * 0.7}
            />
          )
      }
    </div>
  );
};

const AccountAvatar = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {
    borderColor: token.colorPrimary,
    borderRadius: '100%',
    borderStyle: 'solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',

    svg: {
      borderRadius: '100%'
    }
  };
});

export default AccountAvatar;
