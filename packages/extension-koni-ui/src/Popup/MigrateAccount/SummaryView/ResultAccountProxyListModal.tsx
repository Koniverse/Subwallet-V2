// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { useTranslation } from '@subwallet/extension-koni-ui/hooks';
import { ResultAccountProxyItem, ResultAccountProxyItemType } from '@subwallet/extension-koni-ui/Popup/MigrateAccount/SummaryView/ResultAccountProxyItem';
import { ThemeProps, VoidFunction } from '@subwallet/extension-koni-ui/types';
import { Button, SwModal } from '@subwallet/react-ui';
import React from 'react';
import styled from 'styled-components';

type Props = ThemeProps & {
  onClose: VoidFunction;
  accountProxies: ResultAccountProxyItemType[];
}

export const resultAccountProxyListModal = 'resultAccountProxyListModal';

function Component ({ accountProxies, className = '', onClose }: Props): React.ReactElement<Props> {
  const { t } = useTranslation();

  return (
    <SwModal
      className={className}
      footer={(
        <>
          <Button
            block={true}
            onClick={onClose}
          >
            {t('Close')}
          </Button>
        </>
      )}
      id={resultAccountProxyListModal}
      onCancel={onClose}
      title={t('Migrated account list')}
      zIndex={9999}
    >
      {
        accountProxies.map((ap) => (
          <ResultAccountProxyItem
            className={'__account-item'}
            key={ap.accountProxyId}
            {...ap}
          />
        ))
      }
    </SwModal>
  );
}

export const ResultAccountProxyListModal = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return ({
    '.ant-sw-modal-body': {
      paddingBottom: 0
    },

    '.ant-sw-modal-footer': {
      borderTop: 0,
      display: 'flex',
      gap: token.sizeXXS
    },

    '.__account-item + .__account-item': {
      marginTop: token.marginXS
    }
  });
});
