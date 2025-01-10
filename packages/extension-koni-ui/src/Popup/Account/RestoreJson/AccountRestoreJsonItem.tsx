// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountProxyExtra, AccountProxyType } from '@subwallet/extension-base/types';
import { AccountChainTypeLogos, AccountProxyAvatar } from '@subwallet/extension-koni-ui/components';
import { useTranslation } from '@subwallet/extension-koni-ui/hooks';
import { Theme } from '@subwallet/extension-koni-ui/themes';
import { PhosphorIcon } from '@subwallet/extension-koni-ui/types';
import { Icon, Tooltip } from '@subwallet/react-ui';
import CN from 'classnames';
import { CheckCircle, Eye, GitCommit, Needle, QrCode, Question, Strategy, Swatches, Warning } from 'phosphor-react';
import { IconWeight } from 'phosphor-react/src/lib';
import React, { Context, useCallback, useContext, useMemo } from 'react';
import styled, { ThemeContext } from 'styled-components';

import { KeypairType } from '@polkadot/util-crypto/types';

type AccountProxyTypeIcon = {
  className?: string;
  value: PhosphorIcon,
  weight?: IconWeight
}
interface AccountProxyExtra_ extends AccountProxyExtra {
  // Note: "isNameDuplicated" occurs when the account decoded from the fileJson has a duplicate name with other accounts in the same file.
  isNameDuplicated?: boolean;
}

export interface _AccountCardItem {
  className?: string;
  isSelected?: boolean;
  accountProxy: AccountProxyExtra_;
  preventPrefix?: boolean;
  type?: KeypairType;
  showUnSelectedIcon?: boolean;
  isNameDuplicated?: boolean;
  disabled?: boolean;
  onClick?: (value: string) => void;
}

function Component (props: _AccountCardItem): React.ReactElement<_AccountCardItem> {
  const { accountProxy,
    disabled,
    isSelected,
    onClick,
    showUnSelectedIcon } = props;

  const { accountType, chainTypes, id: accountProxyId, name: accountName } = useMemo(() => accountProxy, [accountProxy]);
  const { t } = useTranslation();
  const token = useContext<Theme>(ThemeContext as Context<Theme>).token;
  const disabledItem = useMemo(() => disabled || accountProxy.isExistAccount, [accountProxy.isExistAccount, disabled]);
  const _onSelect = useCallback(() => {
    onClick && onClick(accountProxyId || '');
  },
  [accountProxyId, onClick]
  );

  const accountProxyTypeIconProps = ((): AccountProxyTypeIcon | null => {
    if (accountType === AccountProxyType.UNIFIED) {
      return {
        className: '-is-unified',
        value: Strategy,
        weight: 'fill'
      };
    }

    if (accountType === AccountProxyType.SOLO) {
      return {
        className: '-is-solo',
        value: GitCommit,
        weight: 'fill'
      };
    }

    if (accountType === AccountProxyType.QR) {
      return {
        value: QrCode,
        weight: 'fill'
      };
    }

    if (accountType === AccountProxyType.READ_ONLY) {
      return {
        value: Eye,
        weight: 'fill'
      };
    }

    if (accountType === AccountProxyType.LEDGER) {
      return {
        value: Swatches,
        weight: 'fill'
      };
    }

    if (accountType === AccountProxyType.INJECTED) {
      return {
        value: Needle,
        weight: 'fill'
      };
    }

    if (accountType === AccountProxyType.UNKNOWN) {
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
        className={CN(props.className, '__infinite-loader', { '-selected': isSelected, '-disabled': disabledItem })}
        onClick={disabledItem ? undefined : _onSelect}
      >
        <div className='__item-left-part'>
          <div className='__item-avatar-wrapper'>
            <AccountProxyAvatar
              size={32}
              value={accountProxyId || ''}
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
          <div className={'middle-item__name-wrapper'}>
            <div className='__item-name'>{accountName}</div>

            <AccountChainTypeLogos
              chainTypes={chainTypes}
              className={'__item-chain-type-logos'}
            />
          </div>
        </div>

        <div className={'__item-right-part'}>
          { (accountProxy.isExistName || accountProxy.isNameDuplicated) && !accountProxy.isExistAccount && <div className={'__warning-name-already'}>
            <Tooltip
              placement='bottomLeft'
              title={accountProxy.isExistName ? t('Account name already in use') : t('Duplicate account name')}
            >
              <div>
                <Icon
                  iconColor={token.colorWarning}
                  phosphorIcon={Warning}
                  size='sm'
                  type='phosphor'
                  weight={'fill'}
                />
              </div>
            </Tooltip>
          </div> }
          {(showUnSelectedIcon || isSelected) && !accountProxy.isExistAccount && (
            <Icon
              className={'__select-icon'}
              iconColor={isSelected ? token.colorSuccess : token.colorTextLight4}
              phosphorIcon={CheckCircle}
              size={'sm'}
              weight={'fill'}
            />
          )}
        </div>
      </div>
    </>
  );
}

const AccountRestoreJsonItem = styled(Component)<_AccountCardItem>(({ theme }) => {
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
    cursor: 'pointer',
    transition: `background ${token.motionDurationMid} ease-in-out`,
    marginTop: token.marginXS,
    '&.-selected': {
      backgroundColor: token.colorBgInput
    },

    '&.-disabled': {
      opacity: 0.4,
      cursor: 'not-allowed'
    },

    '.__item-left-part': {
      paddingRight: token.paddingXS
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

      '&.-is-unified': {
        color: token.colorSuccess
      },

      '&.-is-solo': {
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
    '.__item-chain-type-logos': {
      minHeight: 20
    },
    '.__item-right-part': {
      marginLeft: 'auto',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center'
    },
    '.__select-icon.__select-icon, .__warning-name-already': {
      minWidth: 40,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    },

    '&:hover': {
      background: token.colorBgInput
    }
  };
});

export default AccountRestoreJsonItem;
