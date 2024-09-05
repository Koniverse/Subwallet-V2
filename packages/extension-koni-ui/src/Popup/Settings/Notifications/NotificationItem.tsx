// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NotificationInfo } from '@subwallet/extension-koni-ui/Popup/Settings/Notifications/Notification';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import { formatConditionalDuration } from '@subwallet/extension-koni-ui/utils';
import { BackgroundIcon, Button, Icon } from '@subwallet/react-ui';
import CN from 'classnames';
import { DotsThree } from 'phosphor-react';
import React, { SyntheticEvent, useCallback } from 'react';
import styled from 'styled-components';

type Props = ThemeProps & NotificationInfo & {
  onClick?: (value: string) => void;
  onClickMoreBtn: (e: SyntheticEvent) => void;
  disabled?: boolean;
}

const Component: React.FC<Props> = (props: Props) => {
  const { backgroundColor, className, description, disabled, id, leftIcon, onClick, onClickMoreBtn, time, title } = props;
  const _onSelect = useCallback(() => {
    onClick && onClick(id);
  }, [id, onClick]);

  return (
    <div
      className={CN(className, { disabled: disabled })}
      onClick={disabled ? undefined : _onSelect}
    >
      <div className={'left-part'}>
        <BackgroundIcon
          backgroundColor={backgroundColor}
          phosphorIcon={leftIcon}
          size='sm'
          weight='fill'
        />
        <div className={'time-info'}>{formatConditionalDuration(time)}</div>
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
    alignItems: 'center',
    gap: 12,
    paddingTop: token.paddingSM,
    paddingBottom: token.paddingSM,
    paddingRight: token.paddingXXS,
    paddingLeft: token.paddingSM,
    backgroundColor: token.colorBgSecondary,
    borderRadius: token.borderRadiusLG,
    '.left-part': {
      minWidth: 40,
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
    },
    '.time-info': {
      fontSize: token.fontSizeXS,
      fontWeight: token.fontWeightStrong,
      lineHeight: token.lineHeightXS,
      color: token.colorTextDescription,
      'white-space': 'nowrap',
      textAlign: 'center'
    }
  };
});

export default NotificationItem;
