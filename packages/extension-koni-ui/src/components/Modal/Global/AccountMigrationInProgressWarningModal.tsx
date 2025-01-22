// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ACCOUNT_MIGRATION_IN_PROGRESS_WARNING_MODAL } from '@subwallet/extension-koni-ui/constants';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import { Button, Icon, PageIcon, SwModal } from '@subwallet/react-ui';
import CN from 'classnames';
import { ArrowClockwise, Warning } from 'phosphor-react';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

type Props = ThemeProps;

const modalId = ACCOUNT_MIGRATION_IN_PROGRESS_WARNING_MODAL;

const Component: React.FC<Props> = (props: Props) => {
  const { className } = props;
  const { t } = useTranslation();

  const onClickActionButton = useCallback(() => {
    window.location.reload();
  }, []);

  return (
    <>
      <SwModal
        className={CN(className)}
        closable={false}
        destroyOnClose={true}
        footer={
          <>
            <Button
              block={true}
              className={'__action-button'}
              icon={(
                <Icon
                  phosphorIcon={ArrowClockwise}
                  weight={'fill'}
                />
              )}
              onClick={onClickActionButton}
            >
              {t('Reload view')}
            </Button>
          </>
        }
        id={modalId}
        maskClosable={false}
        title={t('Migration in progress')}
        zIndex={1000000}
      >
        <div className='__modal-content'>
          <div className={CN('__warning-icon')}>
            <PageIcon
              color='var(--page-icon-color)'
              iconProps={{
                phosphorIcon: Warning
              }}
            />
          </div>

          {t('You can\'t perform any action in Expand view while account migration is in progress. Reopen SubWallet extension to complete migration, then reload to continue using Expand view')}
        </div>
      </SwModal>
    </>
  );
};

const AccountMigrationInProgressWarningModal = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {
    '.ant-sw-modal-body': {},

    '.ant-sw-modal-footer': {
      display: 'flex',
      borderTop: 0,
      gap: token.sizeXXS
    },

    '.ant-sw-header-center-part': {
      width: '100%',
      maxWidth: 292
    },

    '.__warning-icon': {
      display: 'flex',
      justifyContent: 'center',
      marginBottom: 20,
      '--page-icon-color': token.colorWarning
    },

    '.__modal-content': {
      fontSize: token.fontSize,
      lineHeight: token.lineHeightHeading6,
      textAlign: 'center',
      color: token.colorTextDescription,
      paddingTop: token.padding,
      paddingLeft: token.padding,
      paddingRight: token.padding
    }
  };
});

export default AccountMigrationInProgressWarningModal;
