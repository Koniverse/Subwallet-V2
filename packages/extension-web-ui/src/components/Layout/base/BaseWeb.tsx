// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import Headers from '@subwallet/extension-web-ui/components/Layout/parts/Header';
import { ScreenContext } from '@subwallet/extension-web-ui/contexts/ScreenContext';
import { HeaderType, WebUIContext } from '@subwallet/extension-web-ui/contexts/WebUIContext';
import { useDefaultNavigate, useTranslation } from '@subwallet/extension-web-ui/hooks';
import { ThemeProps } from '@subwallet/extension-web-ui/types';
import { Icon, SwIconProps } from '@subwallet/react-ui';
import CN from 'classnames';
import { ArrowsLeftRight, Clock, Gear, Globe, Parachute, Rocket, Vault, Wallet } from 'phosphor-react';
import React, { useContext, useMemo } from 'react';
import styled from 'styled-components';

import SideMenu from '../parts/SideMenu';

export interface LayoutBaseWebProps {
  children: React.ReactNode | React.ReactNode[];
  className?: string;
}

export type HeaderItemType = {
  label: string;
  value: string;
  icon: SwIconProps;
};
type Props = LayoutBaseWebProps & ThemeProps;
const StyledLayout = styled('div')<ThemeProps>(({ theme: { extendToken, token } }: ThemeProps) => {
  return {
    display: 'flex',
    flex: 'auto',
    position: 'relative',

    '.web-layout-header, .web-layout-header-simple': {
      position: 'relative',
      zIndex: 10
    },

    '.web-layout-background': {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: -1,
      transitionDuration: 'background-color 0.3s ease',
      background: extendToken.tokensScreenInfoBackgroundColor,

      '&.__background-common': {
        background: token.colorBgDefault
      },
      '&.__background-info': {
        background: extendToken.tokensScreenInfoBackgroundColor
      },
      '&.__background-increase': {
        background: extendToken.tokensScreenSuccessBackgroundColor
      },
      '&.__background-decrease': {
        background: extendToken.tokensScreenDangerBackgroundColor
      }
    },

    '.web-layout-container': {
      display: 'flex',
      flexDirection: 'column'
    },

    '.web-layout-sidebar': {
      position: 'relative',
      height: '100vh',
      top: 0,
      display: 'flex',
      flexDirection: 'column'
    },

    '.web-layout-body': {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'auto',
      flex: 1
    },

    '&.header-type-common .web-layout-body': {
      height: '100vh',
      width: '100%'
    },

    '.web-layout-header': {
      flex: 0,
      padding: '24px 36px 48px 44px'
    },

    '.web-layout-content': {
      flex: 1,
      height: '100%',
      overflow: 'auto',

      '&.__with-padding': {
        padding: '0px 44px'
      }
    },

    '.setting-pages .ant-sw-screen-layout-body, .setting-pages .ant-sw-screen-layout-footer': {
      margin: '0 auto',
      width: extendToken.bigOneColumnWidth,
      maxWidth: '100%'
    },

    '.web-cancel-fill-height .ant-sw-screen-layout-body': {
      flex: 'initial'
    },

    '.ant-sw-screen-layout-container': {
      backgroundColor: 'transparent'
    },

    '.ant-sw-screen-layout-body': {
      display: 'flex',
      flexDirection: 'column'
    },

    '.web-single-column': {
      '.ant-sw-screen-layout-body, .ant-sw-screen-layout-footer': {
        width: extendToken.oneColumnWidth,
        maxWidth: '100%',
        marginLeft: 'auto',
        marginRight: 'auto'
      }
    },

    // Custom layout header
    '.ant-sw-screen-layout-header .ant-sw-header-container-center': {
      paddingTop: token.paddingLG,
      paddingBottom: token.paddingLG,

      '.ant-sw-header-left-part': {
        marginLeft: 0
      },

      '.ant-sw-header-center-part': {
        right: 'initial',
        left: 40,
        width: 'auto',

        '.ant-sw-sub-header-title-content': {
          fontSize: 30
        }
      }
    }
  };
});

const Component = ({ children, className }: Props) => {
  const { t } = useTranslation();
  const { isWebUI } = useContext(ScreenContext);
  const { background, headerType, isPortfolio,
    isSettingPage, onBack, setSidebarCollapsed,
    showBackButtonOnHeader, showSidebar,
    sidebarCollapsed, title, webBaseClassName } = useContext(WebUIContext);
  const { goBack, goHome } = useDefaultNavigate();

  const headerTitle = useMemo(() => {
    if (isPortfolio) {
      return t('Portfolio');
    }

    return title;
  }, [isPortfolio, t, title]);

  const LEFT_BLOCK_DATA_LIST = useMemo<HeaderItemType[]>(() => {
    return [
      {
        label: t('Portfolio'),
        value: 'portfolio',
        icon: {
          type: 'phosphor',
          phosphorIcon: Wallet,
          weight: 'fill'
        }
      },
      {
        label: t('Earning'),
        value: 'earning',
        icon: {
          type: 'phosphor',
          phosphorIcon: Vault,
          weight: 'fill'
        }
      },
      {
        label: t('Swap'),
        value: 'swap',
        icon: {
          type: 'phosphor',
          phosphorIcon: ArrowsLeftRight,
          weight: 'fill'
        }
      },
      {
        label: t('dApps'),
        value: 'dapps',
        icon: {
          type: 'phosphor',
          phosphorIcon: Globe,
          weight: 'fill'
        }
      },
      {
        label: t('crowdloans'),
        value: 'crowdloans',
        icon: {
          type: 'phosphor',
          phosphorIcon: Rocket,
          weight: 'fill'
        }
      }
    ];
  }, [t]);

  const RIGHT_BLOCK_DATA_LIST = useMemo<HeaderItemType[]>(() => {
    return [
      {
        label: t('Portfolio'),
        value: 'portfolio',
        icon: {
          type: 'phosphor',
          phosphorIcon: Wallet,
          weight: 'fill'
        }
      },
      {
        label: t('Earning'),
        value: 'earning',
        icon: {
          type: 'phosphor',
          phosphorIcon: Vault,
          weight: 'fill'
        }
      },
      {
        label: t('Swap'),
        value: 'swap',
        icon: {
          type: 'phosphor',
          phosphorIcon: ArrowsLeftRight,
          weight: 'fill'
        }
      },
      {
        label: t('dApps'),
        value: 'dapps',
        icon: {
          type: 'phosphor',
          phosphorIcon: Globe,
          weight: 'fill'
        }
      },
      {
        label: t('crowdloans'),
        value: 'crowdloans',
        icon: {
          type: 'phosphor',
          phosphorIcon: Rocket,
          weight: 'fill'
        }
      }
    ];
  }, [t]);

  if (!isWebUI) {
    return <>{children}</>;
  }

  const isHeaderTypeCommon = [HeaderType.COMMON, HeaderType.COMMON_BACK, HeaderType.COMMON_BACK_TO_HOME].includes(headerType);

  return (
    <>
      <div className={CN(className, '__header-wrapper')}>
        <div className={'__left-block'}>
          {LEFT_BLOCK_DATA_LIST.map((item) => (
            <div className={'header-left-item'} key={item.value}>
              <Icon
                className={'__icon'}
                size={'md'}
                weight={'fill'}
                {...item.icon}
              />
              <div className={'__label'}>{item.label}</div>
            </div>
          ))}
        </div>

        <div className={'__right-block'}>
          {RIGHT_BLOCK_DATA_LIST.map((item) => (
            <div key={item.value}>
              {item.label}
            </div>
          ))}
        </div>
      </div>
      <StyledLayout className={CN('web-layout-container', `header-type-${headerType}`, webBaseClassName)}>
        <div
          className={CN('web-layout-background', `__background-${background}`)}
        />
        {showSidebar && <div className='web-layout-sidebar'>
          <SideMenu
            isCollapsed={sidebarCollapsed}
            setCollapsed={setSidebarCollapsed}
          />
        </div>}

        <div className={CN('web-layout-body', { 'setting-pages': isSettingPage })}>
          {
            isHeaderTypeCommon && (
              <Headers.Controller
                { ...(headerType === HeaderType.COMMON_BACK ? { onBack: onBack || goBack, showBackButton: true } : {}) }
                { ...(headerType === HeaderType.COMMON_BACK_TO_HOME ? { onBack: onBack || goHome, showBackButton: true } : {}) }
                className={'web-layout-header'}
                title={headerTitle}
              />
            )
          }
          {headerType === HeaderType.SIMPLE && (
            <Headers.Simple
              className={'web-layout-header-simple'}
              onBack={onBack}
              showBackButton={showBackButtonOnHeader}
              title={headerTitle}
            />
          )}
          <div className={CN('web-layout-content', { '__with-padding': showSidebar })}>
            {children}
          </div>
        </div>
      </StyledLayout>
    </>
  );
};

const BaseWeb = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return ({
    '&.__header-wrapper': {
      minHeight: 64,
      backgroundColor: token.colorBgInput,
      display: 'flex',
      justifyContent: 'space-between',
      paddingLeft: 32,
      paddingRight: 32
    },
    '.__left-block, .__right-block': {
      display: 'flex',
      gap: 40,
      alignItems: 'center'
    },
    '.header-left-item': {
      display: 'flex',
      alignItems: 'center',
      gap: 2
    }
  });
});

export default BaseWeb;
