// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Layout, PageWrapper } from '@subwallet/extension-koni-ui/components';
import useNotification from '@subwallet/extension-koni-ui/hooks/common/useNotification';
import useTranslation from '@subwallet/extension-koni-ui/hooks/common/useTranslation';
import { Theme, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { BackgroundIcon, Icon, SettingItem, SwIconProps } from '@subwallet/react-ui';
import { CaretRight, CornersOut, Strategy } from 'phosphor-react';
import React, { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { useTheme } from 'styled-components';

type Props = ThemeProps

type SettingItemType = {
  key: string,
  leftIcon: SwIconProps['phosphorIcon'] | React.ReactNode,
  leftIconBgColor: string,
  rightIcon: SwIconProps['phosphorIcon'],
  title: string,
  onClick?: () => void,
  isHidden?: boolean,
};

type SettingGroupItemType = {
  key: string,
  label?: string,
  items: SettingItemType[],
};

const isReactNode = (element: unknown): element is React.ReactNode => {
  return React.isValidElement(element);
};

function generateLeftIcon (backgroundColor: string, icon: SwIconProps['phosphorIcon'] | React.ReactNode): React.ReactNode {
  const isNode = isReactNode(icon);

  return (
    <BackgroundIcon
      backgroundColor={backgroundColor}
      customIcon={isNode ? icon : undefined}
      phosphorIcon={isNode ? undefined : icon}
      size='sm'
      type={isNode ? 'customIcon' : 'phosphor'}
      weight='fill'
    />
  );
}

function generateRightIcon (icon: SwIconProps['phosphorIcon']): React.ReactNode {
  return (
    <Icon
      className='__right-icon'
      customSize={'20px'}
      phosphorIcon={icon}
      type='phosphor'
    />
  );
}

function Component ({ className = '' }: Props): React.ReactElement<Props> {
  const navigate = useNavigate();
  const { token } = useTheme() as Theme;
  const notify = useNotification();
  const { t } = useTranslation();

  const goBack = useCallback(() => {
    navigate('/settings/list');
  }, [navigate]);

  const SettingGroupItemType = useMemo((): SettingGroupItemType[] => ([
    {
      key: 'general',
      items: [
        {
          key: 'migrate-account',
          leftIcon: Strategy,
          leftIconBgColor: token.colorPrimary,
          rightIcon: CaretRight,
          title: t('Migrate to unified account'),
          onClick: () => {
            navigate('/migrate-account');
          }
        },
        {
          key: 'split-account',
          leftIcon: CornersOut,
          leftIconBgColor: token['volcano-6'],
          rightIcon: CaretRight,
          title: t('Split unified account'),
          onClick: () => {
            notify({
              message: 'Coming soon!'
            });
          }
        }
      ]
    }
  ]), [navigate, notify, t, token]);

  return (
    <PageWrapper className={`account-settings ${className}`}>
      <Layout.WithSubHeaderOnly
        onBack={goBack}
        title={t('Account settings')}
      >
        <div className={'__scroll-container'}>
          {
            SettingGroupItemType.map((group) => {
              return (
                <div
                  className={'__group-container'}
                  key={group.key}
                >
                  {!!group.label && (<div className='__group-label'>{group.label}</div>)}

                  <div className={'__group-content'}>
                    {group.items.map((item) => item.isHidden
                      ? null
                      : (
                        <SettingItem
                          className={'__setting-item setting-item'}
                          key={item.key}
                          leftItemIcon={generateLeftIcon(item.leftIconBgColor, item.leftIcon)}
                          name={item.title}
                          onPressItem={item.onClick}
                          rightItem={
                            <>
                              {generateRightIcon(item.rightIcon)}
                            </>
                          }
                        />
                      ))}
                  </div>
                </div>
              );
            })
          }
        </div>
      </Layout.WithSubHeaderOnly>
    </PageWrapper>
  );
}

export const AccountSettings = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return ({
    height: '100%',
    backgroundColor: token.colorBgDefault,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',

    '.__scroll-container': {
      overflow: 'auto',
      paddingTop: token.padding,
      paddingRight: token.padding,
      paddingLeft: token.padding,
      paddingBottom: token.paddingLG
    },

    '.__group-label': {
      color: token.colorTextLight3,
      fontSize: token.fontSizeSM,
      lineHeight: token.lineHeightSM,
      marginBottom: token.marginXS,
      textTransform: 'uppercase'
    },

    '.__group-container': {
      paddingBottom: token.padding
    },

    '.__setting-item + .__setting-item': {
      marginTop: token.marginXS
    },

    '.ant-web3-block-right-item': {
      minWidth: 40,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      color: token['gray-4']
    },

    '.__setting-item:hover .ant-web3-block-right-item': {
      color: token['gray-6']
    }
  });
});

export default AccountSettings;
