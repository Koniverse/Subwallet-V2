// Copyright 2019-2022 @polkadot/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Layout } from '@subwallet/extension-koni-ui/components';
import { CUSTOMIZE_MODAL } from '@subwallet/extension-koni-ui/constants/modal';
import { useSelector } from '@subwallet/extension-koni-ui/hooks';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import { ButtonProps, Icon, ModalContext } from '@subwallet/react-ui';
import CN from 'classnames';
import { BellSimpleRinging, FadersHorizontal, MagnifyingGlass } from 'phosphor-react';
import React, { useCallback, useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

interface Props extends ThemeProps {
  children?: React.ReactNode;
  showFilterIcon?: boolean;
  showSearchIcon?: boolean;
  showNotificationIcon?: boolean;
  onClickFilterIcon?: () => void;
  onClickSearchIcon?: () => void;
  showTabBar?: boolean;
  isDisableHeader?: boolean;

}

const Component = ({ children, className, isDisableHeader, onClickFilterIcon, onClickSearchIcon, showFilterIcon, showNotificationIcon, showSearchIcon, showTabBar }: Props) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { activeModal } = useContext(ModalContext);
  const { unreadNotificationCountMap } = useSelector((state: RootState) => state.notification);
  const { currentAccountProxy, isAllAccount } = useSelector((state: RootState) => state.accountState);
  const { notificationSetup: { isEnabled: notiEnable } } = useSelector((state: RootState) => state.settings);

  const unreadNotificationCount = useMemo(() => {
    if (!currentAccountProxy || !unreadNotificationCountMap) {
      return 0;
    }

    return isAllAccount ? Object.values(unreadNotificationCountMap).reduce((acc, val) => acc + val, 0) : unreadNotificationCountMap[currentAccountProxy.id] || 0;
  }, [currentAccountProxy, isAllAccount, unreadNotificationCountMap]);

  const onOpenCustomizeModal = useCallback(() => {
    activeModal(CUSTOMIZE_MODAL);
  }, [activeModal]);

  const onOpenNotification = useCallback(() => {
    navigate('/settings/notification');
  }, [navigate]);

  const headerIcons = useMemo<ButtonProps[]>(() => {
    const icons: ButtonProps[] = [];

    if (showFilterIcon) {
      icons.push({
        icon: (
          <Icon
            phosphorIcon={FadersHorizontal}
            size='md'
          />
        ),
        onClick: onClickFilterIcon || onOpenCustomizeModal,
        tooltip: t('Customize your asset display'),
        tooltipPlacement: 'bottomRight'
      });
    }

    if (showSearchIcon) {
      icons.push({
        icon: (
          <Icon
            phosphorIcon={MagnifyingGlass}
            size='md'
          />
        ),
        onClick: onClickSearchIcon,
        tooltip: t('Search a token'),
        tooltipPlacement: 'bottomRight'
      });
    }

    if (showNotificationIcon) {
      icons.push({
        icon: (
          <div className={'notification-icon'}>
            <Icon
              phosphorIcon={BellSimpleRinging}
              size='md'
            />
            {notiEnable && !!unreadNotificationCount && <div className={CN('__unread-count')}>{unreadNotificationCount}</div>}
          </div>

        ),
        onClick: onOpenNotification,
        tooltip: t('Notifications'),
        tooltipPlacement: 'bottomRight'
      });
    }

    return icons;
  }, [onClickFilterIcon, onClickSearchIcon, onOpenCustomizeModal, onOpenNotification, showFilterIcon, showNotificationIcon, showSearchIcon, t, unreadNotificationCount, notiEnable]);

  const onClickListIcon = useCallback(() => {
    navigate('/settings/list');
  }, [navigate]);

  return (
    <Layout.Base
      className={className}
      headerCenter={false}
      headerIcons={headerIcons}
      headerLeft={'default'}
      headerOnClickLeft={onClickListIcon}
      headerPaddingVertical={true}
      isDisableHeader={isDisableHeader}
      showHeader={true}
      showLeftButton={true}
      showTabBar={showTabBar ?? true}
    >
      {children}
    </Layout.Base>
  );
};

const Home = styled(Component)<Props>(({ theme: { token } }: Props) => ({
  '.ant-sw-header-right-part': {
    display: 'flex'
  },

  '.ant-sw-header-center-part.ant-sw-header-center-part': {
    paddingRight: 0
  },

  '.notification-icon': {
    position: 'relative',
    display: 'flex'
  },

  '.__unread-count': {
    borderRadius: '50%',
    color: token.colorWhite,
    fontSize: token.sizeXS,
    fontWeight: token.bodyFontWeight,
    lineHeight: token.lineHeightLG,
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: token.colorError,
    position: 'absolute',
    right: 0,
    bottom: 0,
    minWidth: '12px'
  }
}));

export { Home };
