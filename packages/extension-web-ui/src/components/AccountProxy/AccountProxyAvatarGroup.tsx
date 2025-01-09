// Copyright 2019-2022 @subwallet/extension-web-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { RootState } from '@subwallet/extension-web-ui/stores';
import { ThemeProps } from '@subwallet/extension-web-ui/types';
import { isAccountAll } from '@subwallet/extension-web-ui/utils';
import CN from 'classnames';
import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';

import AccountProxyAvatar from './AccountProxyAvatar';

export interface BasicAccountProxyInfo {
  id: string;
  name?: string;
}

interface Props extends ThemeProps {
  accountProxies?: BasicAccountProxyInfo[];
}

const sizeAva = {
  default: 20,
  large: 24
};

const Component: React.FC<Props> = ({ accountProxies: _accountProxies, className }: Props) => {
  const accountProxies = useSelector((state: RootState) => state.accountState.accountProxies);
  const noAllAccountProxy: BasicAccountProxyInfo[] = useMemo((): BasicAccountProxyInfo[] => {
    return (_accountProxies || accountProxies).filter((ap) => !isAccountAll(ap.id));
  }, [_accountProxies, accountProxies]);

  const showCount: number = useMemo((): number => {
    return noAllAccountProxy.length > 2 ? 3 : 2;
  }, [noAllAccountProxy]);

  const countMore: number = useMemo((): number => {
    return noAllAccountProxy.length - 3;
  }, [noAllAccountProxy]);

  return (
    <div className={className}>
      <div className={CN('content-container', { 'ml-strong': countMore > 0 })}>
        {
          noAllAccountProxy.slice(0, 3).map((ap, index) => {
            return (
              <div
                className={CN(
                  'avatar-content',
                  {
                    'avatar-blur': index === 2 && countMore > 0
                  }
                )}
                key={ap.id}
              >
                <AccountProxyAvatar
                  size={showCount === 3 ? sizeAva.default : sizeAva.large}
                  value={ap.id}
                />
              </div>
            );
          })
        }
        {
          countMore > 0 && (
            <div className='cont-more'>+{countMore}</div>
          )
        }
      </div>
    </div>
  );
};

const AccountProxyAvatarGroup = styled(Component)<Props>(({ theme }: Props) => {
  const { token } = theme;

  return {
    position: 'relative',
    width: 'fit-content',

    '.content-container': {
      display: 'flex',
      flexDirection: 'row',

      '.avatar-content': {
        marginLeft: -8
      },

      '&.ml-strong': {
        '.avatar-content': {
          marginLeft: -10
        }
      }
    },

    '.avatar-content:first-child': {
      marginLeft: '0 !important',
      opacity: 0.5
    },

    '.avatar-content:last-child': {
      opacity: 1
    },

    '.avatar-blur': {
      svg: {
        opacity: 0.5
      }
    },

    '.cont-more': {
      fontSize: token.sizeXS,
      lineHeight: `${token.size}px`,
      position: 'absolute',
      width: token.sizeMD,
      height: token.sizeMD,
      right: 0,
      top: 0,
      fontWeight: 700,
      color: token.colorTextBase,
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center'
    }
  };
});

export default AccountProxyAvatarGroup;
