// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NotificationInfo } from '@subwallet/extension-koni-ui/Popup/Settings/Notifications/Notification';
import { Theme, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { BackgroundIcon, Button, Icon } from '@subwallet/react-ui';
import CN from 'classnames';
import { DotsThree } from 'phosphor-react';
import React, { SyntheticEvent } from 'react';
import styled, { useTheme } from 'styled-components';

type Props = ThemeProps & NotificationInfo & {
  onClick?: (value: string) => void;
  onClickMoreBtn: (e: SyntheticEvent) => void;
  disabled?: boolean;
}

const Component: React.FC<Props> = (props: Props) => {
  const { backgroundColor, className, description, disabled, id, leftIcon, notificationType, onClick, onClickMoreBtn, time, title } = props;
  const { token } = useTheme() as Theme;

  console.log('time', time);

  return (
    <div
      className={CN(className, { disabled: disabled })}
      onClick={disabled ? undefined : onClick}
    >
      <div className={'left-part'}>
        <BackgroundIcon
          backgroundColor={backgroundColor}
          phosphorIcon={leftIcon}
          size='sm'
          weight='fill'
        />
        <div className={'time-info'}>{time}</div>
      </div>
      <div className={'right-part'}>
        <div className={'right-part-content'}>
          <div className={'title'}>{title}</div>
          <div className={'description'}>{description}</div>
        </div>
        <div className={'right-part-action'}>
          <Button
            icon={
              <Icon phosphorIcon={DotsThree} />
            }
            onClick={onClickMoreBtn}
            size='xs'
            type='ghost'
          />
        </div>
      </div>
    </div>
  );
};

const NotificationItem = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    paddingTop: token.paddingSM,
    paddingBottom: token.paddingSM,
    paddingRight: token.paddingXXS,
    paddingLeft: token.paddingSM,
    backgroundColor: token.colorBgSecondary,
    borderRadius: token.borderRadiusLG,
    '.left-part': {
      maxWidth: 40,
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      overflow: 'hidden',
      alignItems: 'center'
    },
    '.right-part': {
      display: 'flex',
      gap: 8,
      overflow: 'hidden'
    },
    '.right-part-content': {
      overflow: 'hidden',
      '.title': {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        'white-space': 'nowrap',
        fontSize: 11,
        lineHeight: '20px',
        fontWeight: token.fontWeightStrong,
        textTransform: 'uppercase',
        color: token.colorWhite
      },
      '.description': {
        fontSize: token.fontSizeSM,
        fontWeight: token.bodyFontWeight,
        lineHeight: token.lineHeightSM,
        color: token.colorTextSecondary,
        maxHeight: 40

      }
    }
  };
});

export default NotificationItem;
