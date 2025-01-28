// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { PhosphorIcon, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { Icon, Number, SwIconProps } from '@subwallet/react-ui';
import { SwNumberProps } from '@subwallet/react-ui/es/number';
import CN from 'classnames';
import { CheckCircle, Lightning, Tree, Wind } from 'phosphor-react';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

export type FeeOption = 'slow' |'average' |'fast';

type Props = ThemeProps & {
  time: number; // in milliseconds
  feeValueInfo: {
    value: SwNumberProps['value'],
    decimals: number,
    symbol: string
  },
  type: FeeOption,
  isSelected?: boolean,
  onClick?: VoidFunction;
}

interface IconOption {
  icon: PhosphorIcon;
  weight: SwIconProps['weight'];
}

const IconMap: Record<FeeOption, IconOption> = {
  slow: {
    icon: Tree,
    weight: 'fill'
  },
  average: {
    icon: Wind,
    weight: 'fill'
  },
  fast: {
    icon: Lightning,
    weight: 'fill'
  }
};

const Component: React.FC<Props> = (props: Props) => {
  const { className, feeValueInfo, isSelected, onClick, time, type } = props;
  const { t } = useTranslation();

  const feeTypeNameMap = useMemo<Record<FeeOption, string>>(() => ({
    slow: t('Low'),
    average: t('Medium'),
    fast: t('Highest')
  }), [t]);

  // todo: i18n this, may convert to util
  const timeText = useMemo((): string => {
    if (time >= 0) {
      const seconds = time / 1000;
      const days = Math.floor(seconds / 86400); // 86400 seconds in a day
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);

      let timeString = '';

      if (days > 0) {
        timeString += `${days} ${days === 1 ? 'day' : 'days'}`;
      }

      if (hours > 0) {
        timeString += ` ${hours} ${hours === 1 ? 'hr' : 'hrs'}`;
      }

      if (minutes > 0) {
        timeString += ` ${minutes} ${minutes === 1 ? 'min' : 'mins'}`;
      }

      timeString = timeString.trim();

      return timeString ? `~ ${timeString}` : `${seconds} sec`; // Return '0 minutes' if time is 0
    } else {
      return 'Unknown time';
    }
  }, [time]);

  return (
    <div
      className={className}
      onClick={onClick}
    >
      <div className='__item-left-part'>
        <Icon
          className={CN('__fee-type-icon', `-${type}`)}
          customSize={'16px'}
          phosphorIcon={IconMap[type].icon}
          weight={IconMap[type].weight}
        />
      </div>
      <div className='__item-center-part'>
        <div className='__item-center-part-line-1'>
          <span>{feeTypeNameMap[type]}</span>
          <span>&nbsp;-&nbsp;</span>
          <Number
            className={'__fee-value'}
            decimal={feeValueInfo.decimals}
            suffix={feeValueInfo.symbol}
            value={feeValueInfo.value}
          />
        </div>
        <div className='__item-center-part-line-2'>
          {timeText}
        </div>
      </div>
      <div className='__item-right-part'>
        {isSelected && (
          <Icon
            className={'__check-icon'}
            customSize={'20px'}
            phosphorIcon={CheckCircle}
            weight='fill'
          />)
        }
      </div>
    </div>
  );
};

export const FeeOptionItem = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {
    padding: token.paddingSM,
    backgroundColor: token.colorBgSecondary,
    cursor: 'pointer',
    transition: `background ${token.motionDurationMid} ease-in-out`,
    alignItems: 'center',
    display: 'flex',
    borderRadius: token.borderRadiusLG,

    '.ant-number': {
      '&, .ant-typography': {
        color: 'inherit !important',
        fontSize: 'inherit !important',
        fontWeight: 'inherit !important',
        lineHeight: 'inherit'
      }
    },

    '.__fee-type-icon': {
      borderRadius: '100%',
      minWidth: 24,
      height: 24,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: token.colorTextLight1,

      '&.-slow': {
        backgroundColor: token['green-7']
      },

      '&.-average': {
        backgroundColor: token.colorPrimary
      },

      '&.-fast': {
        backgroundColor: token['gold-6']
      }
    },

    '.__item-left-part': {
      marginRight: token.marginSM
    },

    '.__item-center-part': {
      flex: 1
    },

    '.__item-center-part-line-1': {
      display: 'flex',
      fontSize: token.fontSizeLG,
      lineHeight: token.lineHeightLG,
      color: token.colorTextLight1
    },

    '.__item-center-part-line-2': {
      fontSize: token.fontSize,
      lineHeight: token.lineHeight,
      color: token.colorSecondary
    },

    '.__check-icon': {
      display: 'flex',
      width: 40,
      marginRight: -token.marginXS,
      justifyContent: 'center',
      color: token.colorSuccess,
      marginLeft: -token.marginSM
    },

    '&:hover': {
      background: token.colorBgInput
    }
  };
});
