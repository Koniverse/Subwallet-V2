// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NotificationType } from '@subwallet/extension-base/background/KoniTypes';
import { PageWrapper, RadioGroup } from '@subwallet/extension-koni-ui/components';
import { useDefaultNavigate } from '@subwallet/extension-koni-ui/hooks';
import { Theme, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { BackgroundIcon, Button, Checkbox, SettingItem, Switch, SwSubHeader } from '@subwallet/react-ui';
import CN from 'classnames';
import { BellSimpleRinging } from 'phosphor-react';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled, { useTheme } from 'styled-components';

type Props = ThemeProps;

enum ViewValue {
  TODAY = 'today',
  THIS_WEEK = 'this_week',
  THIS_MONTH = 'this_month',
}

interface ViewOption {
  label: string;
  value: ViewValue;
}

function Component ({ className = '' }: Props): React.ReactElement<Props> {
  const { token } = useTheme() as Theme;
  const { t } = useTranslation();
  const goBack = useDefaultNavigate().goBack;
  const [enableNotification, setEnableNotification] = useState<boolean>(false);

  // const _onChangeOption = useCallback((e: CheckboxChangeEvent) => {
  //   onChangeOption(e.target.value as string, e.target.checked);
  // }, [onChangeOption]);

  const notificationOptions = [
    { label: t('Hide send notifications'), value: NotificationType.SEND },
    { label: t('Hide receive notifications'), value: NotificationType.RECEIVE },
    { label: t('Hide withdraw notifications'), value: NotificationType.WITHDRAW }
  ];

  const viewOptions = useMemo((): ViewOption[] => {
    return [
      {
        label: t('Today'),
        value: ViewValue.TODAY
      },
      {
        label: t('This week'),
        value: ViewValue.THIS_WEEK
      },
      {
        label: t('This month'),
        value: ViewValue.THIS_MONTH
      }
    ];
  }, [t]);

  const onSaveSetting = useCallback(() => {
    alert('Save settings');
  }, []);

  const onSwitchNotification = useCallback(() => {
    setEnableNotification(!enableNotification);
  }, [enableNotification]);

  return (
    <PageWrapper className={`notification-setting ${className}`}>
      <SwSubHeader
        background={'transparent'}
        center
        onBack={goBack}
        paddingVertical
        showBackButton
        title={t('Notification setting')}
      />

      <div className={'body-container'}>
        <div>
          <SettingItem
            className={CN('security-item')}
            leftItemIcon={(
              <BackgroundIcon
                backgroundColor={token['magenta-7']}
                phosphorIcon={BellSimpleRinging}
                size='sm'
                type='phosphor'
                weight='fill'
              />
            )}
            name={t('Enable notifications')}
            rightItem={(
              <Switch
                checked={enableNotification}
                loading={false}
                onClick={onSwitchNotification}
              />
            )}
          />
          {enableNotification && <div className={'__content-wrapper'}>
            <div className={'__options-container'}>
              <div className={'__option-title'}>{t('Notification setup:')}</div>
              {
                notificationOptions.map((option) => (
                  <div
                    className={'__option-item'}
                    key={option.value}
                  >
                    <Checkbox
                      // checked={optionSelectionMap[option.value]}
                      // onChange={_onChangeOption}
                      value={option.value}
                    >
                      <span className={'__option-label'}>{option.label}</span>
                    </Checkbox>
                  </div>
                ))
              }
            </div>
            <div className={'__time-container'}>
              <div className={'__time-title'}>{t('Time setup:')}</div>
              <RadioGroup
                className={'__radio-wrapper'}
                optionType='default'
                options={viewOptions}
              />
            </div>
          </div>}
        </div>
        <Button
          block={true}
          onClick={onSaveSetting}
        >
          {t('Save setting')}
        </Button>
      </div>
    </PageWrapper>
  );
}

const NotificationSetting = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return ({
    height: '100%',
    backgroundColor: token.colorBgDefault,
    display: 'flex',
    flexDirection: 'column',
    '.body-container': {
      padding: token.padding,
      justifyContent: 'space-between',
      display: 'flex',
      height: '100%',
      flexDirection: 'column'
    },

    '.__tool-area': {
      display: 'flex',
      justifyContent: 'space-between'
    },

    '.filter-tabs-container': {
      marginLeft: token.margin
    },

    '.ant-sw-list-section': {
      paddingTop: token.padding,
      flex: 1,
      marginBottom: token.margin
    },

    '.ant-sw-list-section .ant-sw-list': {
      paddingBottom: 0
    },

    '.__item + .__item': {
      marginTop: token.marginXS
    },

    '.__option-title': {
      marginBottom: token.marginSM,
      fontSize: token.fontSize,
      lineHeight: token.lineHeight,
      fontWeight: token.fontWeightStrong,
      color: token.colorWhite
    },

    '.__option-item + .__option-item': {
      marginTop: token.marginMD
    },
    '.__option-item': {
      fontSize: token.fontSize,
      lineHeight: token.lineHeight,
      fontWeight: token.bodyFontWeight,
      color: token.colorWhite
    },
    '.ant-radio-group': {
      backgroundColor: 'transparent'
    },

    '.ant-checkbox-wrapper': {
      display: 'flex',
      alignItems: 'center'
    },
    '.__time-title': {
      marginBottom: token.margin,
      marginTop: token.margin,
      fontSize: token.fontSize,
      lineHeight: token.lineHeight,
      fontWeight: token.fontWeightStrong,
      color: token.colorWhite
    },
    '.__radio-wrapper': {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: token.fontSize,
      lineHeight: token.lineHeight,
      fontWeight: token.bodyFontWeight,
      color: token.colorWhite
    },
    '.security-item': {
      marginBottom: token.margin
    }
  });
});

export default NotificationSetting;
