// Copyright 2019-2022 @subwallet/extension-web-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ScreenContext } from '@subwallet/extension-web-ui/contexts/ScreenContext';
import { SwModalFuncProps } from '@subwallet/react-ui';
import { useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useConfirmModal } from '../modal';

const modalId = 'delete-account-modal';

const useDeleteAccount = () => {
  const { t } = useTranslation();
  const { isWebUI } = useContext(ScreenContext);
  const modalProps: SwModalFuncProps = useMemo(() => {
    return {
      closable: true,
      content: t('If you ever want to use this account again, you would need to attach it again.'),
      id: modalId,
      okText: t('Remove'),
      subTitle: t('Remove this account'),
      title: t('Remove account'),
      type: 'error'
    };
  }, [isWebUI, t]);

  const { handleSimpleConfirmModal } = useConfirmModal(modalProps);

  return handleSimpleConfirmModal;
};

export default useDeleteAccount;
