// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { EXTENSION_VERSION, REMIND_UPGRADE_UNIFIED_ACCOUNT, UPGRADE_UNIFIED_ACCOUNT, VERSION_BEFORE_UNIFIED_ACCOUNT_SUPPORT } from '@subwallet/extension-koni-ui/constants';
import useTranslation from '@subwallet/extension-koni-ui/hooks/common/useTranslation';
import { getValueLocalStorageWS, setValueLocalStorageWS } from '@subwallet/extension-koni-ui/messaging';
import { Theme } from '@subwallet/extension-koni-ui/themes';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import { noop } from '@subwallet/extension-koni-ui/utils';
import { Button, ModalContext, PageIcon, SwModal } from '@subwallet/react-ui';
import CN from 'classnames';
import { ShieldWarning } from 'phosphor-react';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import styled, { useTheme } from 'styled-components';

type Props = ThemeProps;

const RemindUpdateUnifiedAccountModalId = REMIND_UPGRADE_UNIFIED_ACCOUNT;
const PreviousVersion = 'previous_version';
const CHANGE_ACCOUNT_NAME_URL = 'https://docs.subwallet.app/main/extension-user-guide/account-management/switch-between-accounts-and-change-account-name#change-your-account-name';

function Component ({ className }: Props): React.ReactElement<Props> {
  const { t } = useTranslation();
  const { activeModal, inactiveModal } = useContext(ModalContext);
  const [isNeedUpdatedUnifiedAccount, setIsNeedUpdatedUnifiedAccount] = useState(false);
  const { token } = useTheme() as Theme;

  const onCancel = useCallback(() => {
    inactiveModal(RemindUpdateUnifiedAccountModalId);
    setIsNeedUpdatedUnifiedAccount(true);
    setValueLocalStorageWS({ key: UPGRADE_UNIFIED_ACCOUNT, value: 'false' }).catch(noop);
  }, [inactiveModal]);

  const onCheckNeedRemindUnifiedAccount = useCallback(async () => {
    const currentParts = VERSION_BEFORE_UNIFIED_ACCOUNT_SUPPORT.split('.').map(Number);
    const nextParts = EXTENSION_VERSION.split('.').map(Number);
    const isUpdateVersion = await getValueLocalStorageWS(PreviousVersion);

    if (isUpdateVersion) {
      for (let i = 0; i < currentParts.length; i++) {
        if (nextParts[i] > currentParts[i]) {
          return true;
        }
      }
    }

    return false;
  }, []);

  const onRemindUpdateUnifiedAccount = useCallback(async () => {
    const isNeedRemindUnifiedAccount = await onCheckNeedRemindUnifiedAccount();

    if (isNeedRemindUnifiedAccount && !isNeedUpdatedUnifiedAccount) {
      activeModal(RemindUpdateUnifiedAccountModalId);
    } else {
      inactiveModal(RemindUpdateUnifiedAccountModalId);
    }
  }, [activeModal, inactiveModal, isNeedUpdatedUnifiedAccount, onCheckNeedRemindUnifiedAccount]);

  useEffect(() => {
    getValueLocalStorageWS(UPGRADE_UNIFIED_ACCOUNT).then((value) => {
      if (value) {
        setIsNeedUpdatedUnifiedAccount(value === 'true');
      }
    }).catch(noop);
  }, []);
  useEffect(() => {
    onRemindUpdateUnifiedAccount().catch(noop);
  }, [onRemindUpdateUnifiedAccount]);

  const footerModal = useMemo(() => {
    return (
      <>
        <Button
          block={true}
          onClick={onCancel}
        >
          {t('I understand')}
        </Button>
      </>
    );
  }, [onCancel, t]);

  return (
    <>
      <SwModal
        className={CN(className)}
        closable={true}
        footer={footerModal}
        id={RemindUpdateUnifiedAccountModalId}
        maskClosable={false}
        onCancel={onCancel}
        title={t('Duplicate account name')}
      >
        <div className={'__modal-content'}>
          <PageIcon
            color={token['colorWarning-5']}
            iconProps={{
              weight: 'fill',
              phosphorIcon: ShieldWarning
            }}
          />
          <div className='__modal-description'>
            {t('You have accounts with the same name. We have added characters to these account names to differentiate them. You can change account names later using')}
            <a
              href={CHANGE_ACCOUNT_NAME_URL}
              rel='noreferrer'
              style={{ textDecoration: 'underline' }}
              target={'_blank'}
            > this guide</a>
          </div>
        </div>
      </SwModal>
    </>
  );
}

const RemindUpgradeUnifiedAccount = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {
    '.__modal-content': {
      display: 'flex',
      flexDirection: 'column',
      gap: token.size,
      alignItems: 'center',
      padding: `${token.padding}px ${token.padding}px 0 ${token.padding}px`
    },

    '.ant-sw-header-center-part': {
      width: 'fit-content'
    },

    '.__modal-description': {
      textAlign: 'center',
      color: token.colorTextDescription,
      fontSize: token.fontSizeHeading6,
      lineHeight: token.lineHeightHeading6
    },

    '.__modal-user-guide': {
      marginLeft: token.marginXXS
    },

    '.ant-sw-modal-footer': {
      borderTop: 'none',
      display: 'flex',
      gap: token.sizeXXS
    }
  };
});

export default RemindUpgradeUnifiedAccount;
