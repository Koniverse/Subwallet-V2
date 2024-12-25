// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import ContentGenerator from '@subwallet/extension-koni-ui/components/StaticContent/ContentGenerator';
import { useFetchMarkdownContentData } from '@subwallet/extension-koni-ui/hooks';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import { Button, Icon } from '@subwallet/react-ui';
import { CheckCircle, XCircle } from 'phosphor-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

type Props = ThemeProps & {
  onDismiss: VoidFunction;
  onMigrateNow: VoidFunction;
};

type ContentDataType = {
  content: string,
  title: string
};

function Component ({ className = '', onDismiss, onMigrateNow }: Props) {
  const { t } = useTranslation();
  const [contentData, setContentData] = useState<ContentDataType>({
    content: '',
    title: ''
  });
  const fetchMarkdownContentData = useFetchMarkdownContentData();

  useEffect(() => {
    let sync = true;

    fetchMarkdownContentData<ContentDataType>('unified_account_migration_content', ['en'])
      .then((data) => {
        sync && setContentData(data);
      })
      .catch((e) => console.log('fetch unified_account_migration_content error:', e));

    return () => {
      sync = false;
    };
  }, [fetchMarkdownContentData]);

  return (
    <div className={className}>
      <div className='__header-area'>
        {contentData.title}
      </div>

      <div className='__body-area'>
        <ContentGenerator content={contentData.content || ''} />
      </div>

      <div className='__footer-area'>
        <Button
          block={true}
          icon={(
            <Icon
              phosphorIcon={XCircle}
              weight='fill'
            />
          )}
          onClick={onDismiss}
          schema={'secondary'}
        >
          {t('Dismiss')}
        </Button>

        <Button
          block={true}
          icon={(
            <Icon
              phosphorIcon={CheckCircle}
              weight='fill'
            />
          )}
          onClick={onMigrateNow}
        >
          {t('Migrate now')}
        </Button>
      </div>
    </div>
  );
}

export const BriefView = styled(Component)<Props>(({ theme: { extendToken, token } }: Props) => {
  return ({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',

    '.__header-area': {
      minHeight: 74,
      padding: token.padding,
      fontSize: token.fontSizeHeading4,
      lineHeight: token.lineHeightHeading4,
      textAlign: 'center',
      color: token.colorTextLight1,
      borderBottom: '2px solid',
      borderColor: token.colorBgSecondary
    },

    '.__body-area': {
      flex: 1,
      overflow: 'auto',
      padding: token.padding,
      paddingBottom: 0
    },

    '.__footer-area': {
      display: 'flex',
      gap: token.sizeSM,
      paddingLeft: token.padding,
      paddingRight: token.padding,
      paddingTop: token.padding,
      paddingBottom: 32
    }
  });
});
