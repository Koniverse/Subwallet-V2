// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import useAccountAvatarTheme from '@subwallet/extension-koni-ui/hooks/account/useAccountAvatarTheme';
import useGetAccountSignModeByAddress from '@subwallet/extension-koni-ui/hooks/account/useGetAccountSignModeByAddress';
import { useIsMantaPayEnabled } from '@subwallet/extension-koni-ui/hooks/account/useIsMantaPayEnabled';
import useNotification from '@subwallet/extension-koni-ui/hooks/common/useNotification';
import useTranslation from '@subwallet/extension-koni-ui/hooks/common/useTranslation';
import { PhosphorIcon } from '@subwallet/extension-koni-ui/types';
import { AccountSignMode } from '@subwallet/extension-koni-ui/types/account';
import { Button, Icon, Logo } from '@subwallet/react-ui';
import SwAvatar from '@subwallet/react-ui/es/sw-avatar';
import CN from 'classnames';
import { CheckCircle, CopySimple, Eye, PencilSimpleLine, PuzzlePiece, QrCode, ShieldCheck, Swatches } from 'phosphor-react';
import React, { useCallback, useMemo } from 'react';
import CopyToClipboard from 'react-copy-to-clipboard';
import styled from 'styled-components';

import { KeypairType } from '@polkadot/util-crypto/types';

export interface _AccountCardItem {
  className?: string;
  type?: KeypairType;
  onPressMoreButton?: () => void;
  source?: string;
  isSelected?: boolean;
  onClickQrButton?: (address: string) => void;
  accountName?: string;
  address?: string;
}
interface AbstractIcon {
  type: 'icon' | 'node',
  value: PhosphorIcon | React.ReactNode
}

interface SwIconProps extends AbstractIcon {
  type: 'icon',
  value: PhosphorIcon
}

interface NodeIconProps extends AbstractIcon {
  type: 'node',
  value: React.ReactNode
}

type IconProps = SwIconProps | NodeIconProps;

function Component (props: _AccountCardItem): React.ReactElement<_AccountCardItem> {
  const { accountName,
    address,
    isSelected,
    onClickQrButton,
    onPressMoreButton } = props;

  const notify = useNotification();
  const { t } = useTranslation();

  const avatarTheme = useAccountAvatarTheme(address || '');

  const signMode = useGetAccountSignModeByAddress(address);
  const isMantaPayEnabled = useIsMantaPayEnabled(address);

  const iconProps: IconProps | undefined = useMemo((): IconProps | undefined => {
    switch (signMode) {
      case AccountSignMode.LEDGER:
        return {
          type: 'icon',
          value: Swatches
        };
      case AccountSignMode.QR:
        return {
          type: 'icon',
          value: QrCode
        };
      case AccountSignMode.READ_ONLY:
        return {
          type: 'icon',
          value: Eye
        };
      case AccountSignMode.INJECTED:
        // if (source === 'SubWallet') {
        //   return {
        //     type: 'node',
        //     value: (
        //       <Image
        //         className='logo-image'
        //         height='var(--height)'
        //         shape='square'
        //         src={'/images/subwallet/gradient-logo.png'}
        //       />
        //     )
        //   };
        // }

        return {
          type: 'icon',
          value: PuzzlePiece
        };
    }

    if (isMantaPayEnabled) {
      return {
        type: 'icon',
        value: ShieldCheck
      };
    }

    return undefined;
  }, [isMantaPayEnabled, signMode]);

  const _onClickMore: React.MouseEventHandler<HTMLAnchorElement | HTMLButtonElement> = React.useCallback((event) => {
    event.stopPropagation();
    onPressMoreButton && onPressMoreButton();
  }, [onPressMoreButton]);

  const _onClickQrBtn = useCallback(() => {
    onClickQrButton?.(address || '');
  }, [onClickQrButton, address]);

  const _onCLickCopyButton = useCallback((e: React.SyntheticEvent) => {
    e.stopPropagation();
    notify({
      message: t('Copied to clipboard')
    });
  }, [notify, t]);

  const truncatedAddress = address ? `${address.substring(0, 6)}...${address.slice(-6)}` : '';

  return (
    <>
      <div className={CN(props.className)}>
        <div className='__item-left-part'>
          <SwAvatar
            identPrefix={42}
            isShowSubIcon={true}
            size={40}
            subIcon={(
              <Logo
                network={avatarTheme}
                shape={'circle'}
                size={16}
              />
            )}
            theme={avatarTheme}
            value={address || ''}
          />
        </div>
        <div className='__item-center-part'>
          <div className='__item-name'>{accountName}</div>
          <div className='__item-address'>{truncatedAddress}</div>
        </div>
        <div className='__item-right-part'>
          <div className='__item-actions'>
            <Button
              className='-show-on-hover'
              icon={
                <Icon
                  phosphorIcon={QrCode}
                  size='sm'
                />
              }
              onClick={_onClickQrBtn}
              size='xs'
              tooltip={t('Show QR code')}
              type='ghost'
            />
            <CopyToClipboard text={address || ''}>
              <Button
                className='-show-on-hover'
                icon={
                  <Icon
                    phosphorIcon={CopySimple}
                    size='sm'
                  />
                }
                onClick={_onCLickCopyButton}
                size='xs'
                tooltip={t('Copy address')}
                type='ghost'
              />
            </CopyToClipboard>
            <Button
              icon={
                <Icon
                  phosphorIcon={PencilSimpleLine}
                  size='sm'
                />
              }
              onClick={_onClickMore}
              size='xs'
              type='ghost'

            />
          </div>
          <div className='__item-actions-overlay'>
            {isSelected && (
              <Button
                icon={
                  <Icon
                    iconColor='#4CEAAC'
                    phosphorIcon={CheckCircle}
                    size='sm'
                    weight='fill'
                  />
                }
                size='xs'
                type='ghost'
              />
            )}
            {iconProps && (
              <Button
                icon={
                  iconProps.type === 'icon'
                    ? (
                      <Icon
                        phosphorIcon={iconProps.value}
                        size='sm'
                      />
                    )
                    : iconProps.value
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

const AccountCardItem = styled(Component)<_AccountCardItem>(() => {
  return {
    height: '68px',
    background: '#1A1A1A',
    padding: '12px 12px 12px 12px',
    borderRadius: '8px',
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',

    '.__item-left-part': {
      paddingRight: '8px'
    },
    '.__item-center-part': {
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      flex: 1
    },
    '.__item-name': {
      fontSize: '16px',
      color: '#FFFFFF',
      height: '24px',
      textOverflow: 'ellipsis',
      overflow: 'hidden',
      whiteSpace: 'nowrap'
    },
    '.__item-address': {
      fontSize: '12px',
      color: '#FFFFFF73',
      height: '20px',
      textOverflow: 'ellipsis',
      overflow: 'hidden',
      whiteSpace: 'nowrap'
    },
    '.__item-right-part': {
      marginLeft: 'auto',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
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
      marginRight: '40px',
      transition: 'opacity 0.2s ease-in-out'
    },
    '.-show-on-hover': {
      opacity: 0
    },
    '&:hover': {
      background: '#252525',
      cursor: 'pointer',
      '.__item-actions-overlay': {
        opacity: 0
      },
      '.-show-on-hover': {
        opacity: 1,
        transition: 'opacity 0.2s ease-in-out'
      }
    }
  };
});

export default AccountCardItem;
