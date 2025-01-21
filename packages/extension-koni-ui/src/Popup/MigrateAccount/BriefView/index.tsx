// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { LoadingScreen } from '@subwallet/extension-koni-ui/components';
import ContentGenerator from '@subwallet/extension-koni-ui/components/StaticContent/ContentGenerator';
import { useFetchMarkdownContentData } from '@subwallet/extension-koni-ui/hooks';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import { Button, Icon, PageIcon } from '@subwallet/react-ui';
import CN from 'classnames';
import { CheckCircle, Warning, XCircle } from 'phosphor-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

type Props = ThemeProps & {
  isForcedMigration?: boolean;
  onDismiss: VoidFunction;
  onMigrateNow: VoidFunction;
};

type ContentDataType = {
  content: string,
  title: string
};

function Component ({ className = '', isForcedMigration, onDismiss, onMigrateNow }: Props) {
  const { t } = useTranslation();
  const [contentData, setContentData] = useState<ContentDataType>({
    content: '',
    title: ''
  });
  const [isFetchingBriefContent, setIsFetchingBriefContent] = useState<boolean>(true);

  const fetchMarkdownContentData = useFetchMarkdownContentData();

  useEffect(() => {
    let sync = true;

    if (!isForcedMigration) {
      setIsFetchingBriefContent(true);

      fetchMarkdownContentData<ContentDataType>('unified_account_migration_content', ['en'])
        .then((data) => {
          if (sync) {
            setContentData(data);
            setIsFetchingBriefContent(false);
          }
        })
        .catch((e) => console.log('fetch unified_account_migration_content error:', e));
    }

    return () => {
      sync = false;
    };
  }, [fetchMarkdownContentData, isForcedMigration]);

  useEffect(() => {
    if (isForcedMigration) {
      setIsFetchingBriefContent(false);
    }
  }, [isForcedMigration]);

  if (isFetchingBriefContent) {
    return (<LoadingScreen />);
  }

  return (
    <div className={CN(className, {
      '-forced-migration': isForcedMigration
    })}
    >
      <div className='__header-area'>
        <div className='__view-title'>
          {
            !isForcedMigration
              ? contentData.title
              : t('Migration incomplete!')
          }
        </div>
      </div>

      <div className='__body-area'>
        {
          !isForcedMigration && (
            <ContentGenerator
              className={'__content-generator'}
              content={contentData.content || ''}
            />
          )
        }

        {
          isForcedMigration && (
            <>
              <div className={CN('__warning-icon')}>
                <PageIcon
                  color='var(--page-icon-color)'
                  iconProps={{
                    phosphorIcon: Warning
                  }}
                />
              </div>
              <div className={'__forced-migration-content'}>
                <div className='__content-line'>
                  {t('Account migration is not yet complete. If this process remains incomplete, you will not be able to perform any action on SubWallet extension.')}
                </div>
                <div className='__content-line'>
                  {t('Make sure to complete the migration to avoid any potential issues with your accounts. Hit “Continue” to resume and complete the process. ')}
                </div>
              </div>
            </>
          )
        }
      </div>

      <div className='__footer-area'>
        {
          !isForcedMigration && (
            <>
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
                {t('Cancel')}
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
            </>
          )
        }

        {
          isForcedMigration && (
            <Button
              block={true}
              onClick={onMigrateNow}
            >
              {t('Continue')}
            </Button>
          )
        }
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
      color: token.colorTextLight1,
      borderBottom: '2px solid',
      borderColor: token.colorBgSecondary,
      display: 'flex',
      alignItems: 'center'
    },

    '.__view-title': {
      flex: 1,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      'white-space': 'nowrap',
      fontSize: token.fontSizeHeading4,
      lineHeight: token.lineHeightHeading4,
      textAlign: 'center'
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
    },

    '.__forced-migration-content': {
      textAlign: 'center',
      color: token.colorTextLight4,
      fontSize: token.fontSize,
      lineHeight: token.lineHeight
    },

    '.__warning-icon': {
      display: 'flex',
      justifyContent: 'center',
      marginBottom: 20,
      '--page-icon-color': token.colorWarning
    },

    '.__content-line + .__content-line': {
      marginTop: 20
    },

    // content generator

    '.md-element + .md-element': {
      marginTop: 20
    },

    '.md-subtitle': {
      fontSize: token.fontSizeHeading5,
      lineHeight: token.lineHeightHeading5,
      textAlign: 'center'
    },

    '.md-banner': {
      maxWidth: '100%',
      display: 'block'
    },

    '.md-text-center': {
      textAlign: 'center'
    },

    '.md-p-tag': {
      color: token.colorTextLight4,
      fontSize: token.fontSize,
      lineHeight: token.lineHeight
    },

    '&.-forced-migration': {
      '.__body-area': {
        paddingTop: 40,
        paddingRight: 32,
        paddingLeft: 32
      }
    }
  });
});
