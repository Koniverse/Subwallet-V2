// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NotificationInfoItem } from '@subwallet/extension-koni-ui/Popup/Settings/Notifications/Notification';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import { convertHexColorToRGBA, formatConditionalDuration } from '@subwallet/extension-koni-ui/utils';
import { BackgroundIcon, Button, Icon } from '@subwallet/react-ui';
import CN from 'classnames';
import { DotsThree } from 'phosphor-react';
import React, { SyntheticEvent } from 'react';
import styled from 'styled-components';

type Props = ThemeProps & NotificationInfoItem & {
  onClick?: () => void;
  onClickMoreBtn: (e: SyntheticEvent) => void;
  disabled?: boolean;
}

const Component: React.FC<Props> = (props: Props) => {
  const { backgroundColor, className, description, disabled, leftIcon, onClick, onClickMoreBtn, time, title } = props;

  return (
    <div
      className={CN(className, { disabled: disabled })}
      onClick={disabled ? undefined : onClick}
    >
      <div className={'__left-part'}>
        <BackgroundIcon
          backgroundColor={convertHexColorToRGBA(backgroundColor, 0.1)}
          iconColor={backgroundColor}
          phosphorIcon={leftIcon}
          size={'large'}
          weight='fill'
        />
        <div className={'__time-info'}>{formatConditionalDuration(time)}</div>
      </div>
      <div className={'__right-part'}>
        <div className={'__right-part-content'}>
          <div className={'__title'}>{title}</div>
          <div className={'__description'}>{description}</div>
        </div>
        <div className={'__right-part-action'}>
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
    alignItems: 'center',
    gap: 12,
    paddingTop: token.paddingSM,
    paddingBottom: token.paddingSM,
    paddingRight: token.paddingXXS,
    paddingLeft: token.paddingSM,
    backgroundColor: token.colorBgSecondary,
    borderRadius: token.borderRadiusLG,
    cursor: 'pointer',
    '.__left-part': {
      minWidth: 40,
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      overflow: 'hidden',
      alignItems: 'center'
    },
    '.__right-part': {
      display: 'flex',
      gap: 8,
      overflow: 'hidden'
    },
    '.__right-part-content': {
      overflow: 'hidden',
      '.__title': {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        'white-space': 'nowrap',
        fontSize: 11,
        lineHeight: '20px',
        fontWeight: token.fontWeightStrong,
        textTransform: 'uppercase',
        color: token.colorWhite
      },
      '.__description': {
        fontSize: token.fontSizeSM,
        fontWeight: token.bodyFontWeight,
        lineHeight: token.lineHeightSM,
        color: token.colorTextSecondary,
        maxHeight: 40

      }
    },
    '.__time-info': {
      fontSize: token.fontSizeXS,
      fontWeight: token.fontWeightStrong,
      lineHeight: token.lineHeightXS,
      color: token.colorTextDescription,
      'white-space': 'nowrap',
      textAlign: 'center'
    },
    '.ant-background-icon': {
      width: '40px !important',
      height: '40px !important'
    }
  };
});

export default NotificationItem;
