// Copyright 2019-2022 @polkadot/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Layout } from '@subwallet/extension-koni-ui/components';
import { CUSTOMIZE_MODAL } from '@subwallet/extension-koni-ui/constants/modal';
import { ButtonProps, Icon, ModalContext } from '@subwallet/react-ui';
import { BellSimpleRinging, FadersHorizontal, MagnifyingGlass } from 'phosphor-react';
import React, { useCallback, useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

type Props = {
  children?: React.ReactNode;
  showFilterIcon?: boolean;
  showSearchIcon?: boolean;
  showNotificationIcon?: boolean;
  onClickFilterIcon?: () => void;
  onClickSearchIcon?: () => void;
  showTabBar?: boolean;
  isDisableHeader?: boolean;

};

const Home = ({ children, isDisableHeader, onClickFilterIcon, onClickSearchIcon, showFilterIcon, showNotificationIcon, showSearchIcon, showTabBar }: Props) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { activeModal } = useContext(ModalContext);

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
          <Icon
            phosphorIcon={BellSimpleRinging}
            size='md'
          />
        ),
        onClick: onOpenNotification,
        tooltip: t('Notifications'),
        tooltipPlacement: 'bottomRight'
      });
    }

    return icons;
  }, [onClickFilterIcon, onClickSearchIcon, onOpenCustomizeModal, onOpenNotification, showFilterIcon, showNotificationIcon, showSearchIcon, t]);

  const onClickListIcon = useCallback(() => {
    navigate('/settings/list');
  }, [navigate]);

  return (
    <Layout.Base
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

export { Home };
