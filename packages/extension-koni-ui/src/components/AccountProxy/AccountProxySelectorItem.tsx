// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountProxy, AccountProxyType } from '@subwallet/extension-base/types';
import { useTranslation } from '@subwallet/extension-koni-ui/hooks';
import { Theme } from '@subwallet/extension-koni-ui/themes';
import { PhosphorIcon, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { Button, Icon } from '@subwallet/react-ui';
import CN from 'classnames';
import { CheckCircle, Copy, Eye, GitCommit, GitMerge, Needle, PencilSimpleLine, QrCode, Question, Strategy, Swatches } from 'phosphor-react';
import { IconWeight } from 'phosphor-react/src/lib';
import React, { Context, useContext } from 'react';
import styled, { ThemeContext } from 'styled-components';

import AccountProxyAvatar from './AccountProxyAvatar';

type Props = ThemeProps & {
  className?: string;
  isSelected?: boolean;
  accountProxy: AccountProxy;
  onClick?: VoidFunction;
  onClickCopyButton?: VoidFunction;
  onClickDeriveButton?: VoidFunction;
  onClickMoreButton?: VoidFunction;
  showDeriveButton?: boolean;
}

// @ts-ignore
type AccountProxyTypeIcon = {
  className?: string;
  value: PhosphorIcon | React.ReactNode,
  weight?: IconWeight
}

function Component (props: Props): React.ReactElement<Props> {
  const { accountProxy,
    isSelected,
    onClick,
    onClickCopyButton,
    onClickDeriveButton,
    onClickMoreButton, showDeriveButton } = props;

  const token = useContext<Theme>(ThemeContext as Context<Theme>).token;

  const { t } = useTranslation();

  const _onClickDeriveButton: React.MouseEventHandler<HTMLAnchorElement | HTMLButtonElement> = React.useCallback((event) => {
    event.stopPropagation();
    onClickDeriveButton?.();
  }, [onClickDeriveButton]);

  const _onClickCopyButton: React.MouseEventHandler<HTMLAnchorElement | HTMLButtonElement> = React.useCallback((event) => {
    event.stopPropagation();
    onClickCopyButton?.();
  }, [onClickCopyButton]);

  const _onClickMoreButton: React.MouseEventHandler<HTMLAnchorElement | HTMLButtonElement> = React.useCallback((event) => {
    event.stopPropagation();
    onClickMoreButton?.();
  }, [onClickMoreButton]);

  const accountProxyTypeIconProps = (() => {
    if (accountProxy.accountType === AccountProxyType.MULTI) {
      return {
        className: '-is-multi',
        value: Strategy,
        weight: 'fill'
      };
    }

    if (accountProxy.accountType === AccountProxyType.SINGLE) {
      return {
        className: '-is-single',
        value: GitCommit,
        weight: 'fill'
      };
    }

    if (accountProxy.accountType === AccountProxyType.QR) {
      return {
        value: QrCode,
        weight: 'fill'
      };
    }

    if (accountProxy.accountType === AccountProxyType.READ_ONLY) {
      return {
        value: Eye,
        weight: 'fill'
      };
    }

    if (accountProxy.accountType === AccountProxyType.LEDGER) {
      return {
        value: Swatches,
        weight: 'fill'
      };
    }

    if (accountProxy.accountType === AccountProxyType.INJECTED) {
      return {
        value: Needle,
        weight: 'fill'
      };
    }

    if (accountProxy.accountType === AccountProxyType.UNKNOWN) {
      return {
        value: Question,
        weight: 'fill'
      };
    }

    return null;
  })();

  return (
    <>
      <div
        className={CN(props.className)}
        onClick={onClick}
      >
        <div className='__item-left-part'>
          <div className='__item-avatar-wrapper'>
            <AccountProxyAvatar
              size={32}
              value={accountProxy.id}
            />

            {
              !!accountProxyTypeIconProps && (
                <div className={CN('__item-avatar-icon', accountProxyTypeIconProps.className, {
                  '-is-derived': !!accountProxy.parentId
                })}
                >
                  <Icon
                    customSize={'12px'}
                    phosphorIcon={accountProxyTypeIconProps.value}
                    weight={accountProxyTypeIconProps.weight as IconWeight}
                  />
                </div>
              )
            }
          </div>
        </div>
        <div className='__item-center-part'>
          <div className='__item-name'>{accountProxy.name}</div>
          <div className='__item-networks'>{accountProxy.name}</div>
        </div>
        <div className='__item-right-part'>
          <div className='__item-actions'>
            {
              showDeriveButton && (
                <Button
                  className='-show-on-hover'
                  icon={
                    <Icon
                      phosphorIcon={GitMerge}
                      size='sm'
                    />
                  }
                  onClick={_onClickDeriveButton}
                  size='xs'
                  tooltip={t('View derived accounts')}
                  type='ghost'
                />
              )
            }
            <Button
              className='-show-on-hover'
              icon={
                <Icon
                  phosphorIcon={Copy}
                  size='sm'
                />
              }
              onClick={_onClickCopyButton}
              size='xs'
              tooltip={t('Copy address')}
              type='ghost'
            />
            <Button
              icon={
                <Icon
                  phosphorIcon={PencilSimpleLine}
                  size='sm'
                />
              }
              onClick={_onClickMoreButton}
              size='xs'
              type='ghost'
            />
          </div>
          <div className='__item-actions-overlay'>
            {isSelected && (
              <Button
                icon={
                  <Icon
                    iconColor={token.colorSuccess}
                    phosphorIcon={CheckCircle}
                    size='sm'
                    weight='fill'
                  />
                }
                size='xs'
                type='ghost'
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

const AccountProxySelectorItem = styled(Component)<Props>(({ theme }) => {
  const { token } = theme as Theme;

  return {
    background: token.colorBgSecondary,
    paddingLeft: token.paddingSM,
    paddingRight: token.paddingXXS,
    paddingTop: token.paddingXS,
    paddingBottom: token.paddingXS,
    borderRadius: token.borderRadiusLG,
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    cursor: 'pointer',
    transition: `background ${token.motionDurationMid} ease-in-out`,

    '.__item-left-part': {
      paddingRight: token.paddingSM
    },
    '.__item-avatar-wrapper': {
      position: 'relative'
    },
    '.__item-avatar-icon': {
      color: token.colorWhite,
      width: 16,
      height: 16,
      position: 'absolute',
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '100%',

      '&.-is-multi': {
        color: token.colorSuccess
      },

      '&.-is-single': {
        color: token['blue-9']
      },

      '&.-is-derived': {
        color: token.colorWarning
      }
    },
    '.__item-center-part': {
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      flex: 1
    },
    '.__item-name': {
      fontSize: token.fontSize,
      color: token.colorTextLight1,
      lineHeight: token.lineHeight,
      textOverflow: 'ellipsis',
      overflow: 'hidden',
      'white-space': 'nowrap'
    },
    '.__item-networks': {
      fontSize: token.fontSizeSM,
      color: token.colorTextLight4,
      lineHeight: '18px'
    },
    '.__item-address': {
      fontSize: token.fontSizeSM,
      color: token.colorTextLight4,
      lineHeight: token.lineHeightSM,
      textOverflow: 'ellipsis',
      overflow: 'hidden',
      'white-space': 'nowrap'
    },
    '.__item-right-part': {
      marginLeft: 'auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      minWidth: 120,
      position: 'relative'
    },
    '.__item-actions-overlay': {
      display: 'flex',
      flexDirection: 'row',
      pointerEvents: 'none',
      position: 'absolute',
      inset: 0,
      opacity: 1,
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginRight: 40,
      transition: `opacity ${token.motionDurationMid} ease-in-out`
    },
    '.-show-on-hover': {
      opacity: 0,
      transition: `opacity ${token.motionDurationMid} ease-in-out`
    },
    '&:hover': {
      background: token.colorBgInput,
      '.__item-actions-overlay': {
        opacity: 0
      },
      '.-show-on-hover': {
        opacity: 1
      }
    }
  };
});

export default AccountProxySelectorItem;
