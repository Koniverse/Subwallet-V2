// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ACCOUNT_MIGRATION_IN_PROGRESS_WARNING_MODAL } from '@subwallet/extension-koni-ui/constants';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import { SwModal } from '@subwallet/react-ui';
import CN from 'classnames';
import React from 'react';
import styled from 'styled-components';

type Props = ThemeProps;

const modalId = ACCOUNT_MIGRATION_IN_PROGRESS_WARNING_MODAL;

const Component: React.FC<Props> = (props: Props) => {
  const { className } = props;

  return (
    <>
      <SwModal
        className={CN(className)}
        closable={false}
        destroyOnClose={true}
        id={modalId}
        maskClosable={false}
        title={'Warning'}
        zIndex={1000000}
      >
        <div className='__modal-content'>
          Account migration is in progress
        </div>
      </SwModal>
    </>
  );
};

const AccountMigrationInProgressWarningModal = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {
    '.ant-sw-modal-body': {

    },

    '.ant-sw-modal-footer': {
      display: 'flex',
      borderTop: 0,
      gap: token.sizeXXS
    },

    '.ant-sw-header-center-part': {
      width: '100%',
      maxWidth: 292
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
