// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NotificationSetup, NotificationTimePeriod, NotificationActionType } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';
import { PageWrapper, RadioGroup } from '@subwallet/extension-koni-ui/components';
import { useDefaultNavigate } from '@subwallet/extension-koni-ui/hooks';
import { saveNotificationSetup } from '@subwallet/extension-koni-ui/messaging';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import { Theme, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { BackgroundIcon, Button, Checkbox, SettingItem, Switch, SwSubHeader } from '@subwallet/react-ui';
import CN from 'classnames';
import { BellSimpleRinging } from 'phosphor-react';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import styled, { useTheme } from 'styled-components';

type Props = ThemeProps;

interface ViewOption {
  label: string;
  value: NotificationTimePeriod;
}

function Component ({ className = '' }: Props): React.ReactElement<Props> {
  const { token } = useTheme() as Theme;
  const { t } = useTranslation();
  const goBack = useDefaultNavigate().goBack;
  const { notificationSetup } = useSelector((state: RootState) => state.settings);
  const enableNotification = notificationSetup.isEnabled;
  const [loadingNotification, setLoadingNotification] = useState(false);

  const notificationOptions = [
    { label: t('Hide send notifications'), value: NotificationActionType.SEND },
    { label: t('Hide receive notifications'), value: NotificationActionType.RECEIVE },
    { label: t('Hide withdraw notifications'), value: NotificationActionType.WITHDRAW },
    { label: t('Hide claim notifications'), value: NotificationActionType.CLAIM }
  ];

  const timeSetup = useMemo((): ViewOption[] => {
    return [
      {
        label: t('Today'),
        value: NotificationTimePeriod.TODAY
      },
      {
        label: t('This week'),
        value: NotificationTimePeriod.THIS_WEEK
      },
      {
        label: t('This month'),
        value: NotificationTimePeriod.THIS_MONTH
      }
    ];
  }, [t]);

  const onSaveNotificationSetup = useCallback((setup: NotificationSetup) => {
    return () => {
      setLoadingNotification(true);
      saveNotificationSetup(setup)
        .catch(console.error)
        .finally(() => {
          setLoadingNotification(false);
        });
    };
  }, []);

  const onSwitchNotification = useCallback((currentValue: boolean) => {
    return () => {
      const newNotificationSetup = {
        ...notificationSetup,
        isEnabled: !currentValue
      };

      setLoadingNotification(true);
      saveNotificationSetup(newNotificationSetup)
        .catch(console.error)
        .finally(() => {
          setLoadingNotification(false);
        });
    };
  }, [notificationSetup]);

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
                loading={loadingNotification}
                onClick={onSwitchNotification(enableNotification)}
              />
            )}
          />
          {enableNotification && <div className={'content-wrapper'}>
            <div className={'options-container'}>
              <div className={'option-title'}>{t('Notification setup:')}</div>
              {
                notificationOptions.map((option) => (
                  <div
                    className={'option-item'}
                    key={option.value}
                  >
                    <Checkbox
                      value={option.value}
                    >
                      <span className={'option-label'}>{option.label}</span>
                    </Checkbox>
                  </div>
                ))
              }
            </div>
            <div className={'time-container'}>
              <div className={'time-title'}>{t('Time setup:')}</div>
              <RadioGroup
                className={'radio-wrapper'}
                optionType='default'
                options={timeSetup}
              />
            </div>
          </div>}
        </div>
        <Button
          block={true}
          // todo: handle params for notification setup
          onClick={onSaveNotificationSetup({
            isEnabled: true,
            notificationSetup: {
              isHideAnnouncement: true,
              isHideMarketing: true,
              isHideReceive: false,
              isHideSend: false,
              isHideWithdraw: false
            }
          })}
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

    '.option-title': {
      marginBottom: token.marginSM,
      fontSize: token.fontSize,
      lineHeight: token.lineHeight,
      fontWeight: token.fontWeightStrong,
      color: token.colorWhite
    },

    '.option-item + .option-item': {
      marginTop: token.marginMD
    },
    '.option-item': {
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
    '.time-title': {
      marginBottom: token.margin,
      marginTop: token.margin,
      fontSize: token.fontSize,
      lineHeight: token.lineHeight,
      fontWeight: token.fontWeightStrong,
      color: token.colorWhite
    },
    '.radio-wrapper': {
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
