// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import { Button } from '@subwallet/react-ui';
import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

type Props = ThemeProps & {
  onDismiss: VoidFunction;
  onMigrateNow: VoidFunction;
};

function Component ({ className = '', onDismiss, onMigrateNow }: Props) {
  const { t } = useTranslation();

  return (
    <div className={className}>
      <Button onClick={onDismiss}>
        {t('Dismiss')}
      </Button>

      <Button onClick={onMigrateNow}>
        {t('Migrate now')}
      </Button>
    </div>
  );
}

export const BriefView = styled(Component)<Props>(({ theme: { extendToken, token } }: Props) => {
  return ({

  });
});
