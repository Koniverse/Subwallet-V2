// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { useTranslation } from '@subwallet/extension-koni-ui/hooks';
import { ResultAccountProxyItem, ResultAccountProxyItemType } from '@subwallet/extension-koni-ui/Popup/MigrateAccount/SummaryView/ResultAccountProxyItem';
import { ResultAccountProxyListModal, resultAccountProxyListModal } from '@subwallet/extension-koni-ui/Popup/MigrateAccount/SummaryView/ResultAccountProxyListModal';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import { Button, Icon, ModalContext, PageIcon } from '@subwallet/react-ui';
import { CheckCircle } from 'phosphor-react';
import React, { useCallback, useContext, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';

type Props = ThemeProps & {
  resultProxyIds: string[];
  onClickFinish: VoidFunction;
};

function Component ({ className = '', onClickFinish, resultProxyIds }: Props) {
  const { t } = useTranslation();
  const { activeModal, inactiveModal } = useContext(ModalContext);
  const [isAccountListModalOpen, setIsAccountListModalOpen] = useState<boolean>(false);
  const accountProxies = useSelector((root: RootState) => root.accountState.accountProxies);

  const accountProxyNameMapById = useMemo(() => {
    const result: Record<string, string> = {};

    accountProxies.forEach((ap) => {
      result[ap.id] = ap.name;
    });

    return result;
  }, [accountProxies]);

  const resultAccountProxies = useMemo<ResultAccountProxyItemType[]>(() => {
    return resultProxyIds.map((id) => ({
      accountName: accountProxyNameMapById[id] || '',
      accountProxyId: id
    }));
  }, [accountProxyNameMapById, resultProxyIds]);

  const onOpenAccountListModal = useCallback(() => {
    setIsAccountListModalOpen(true);
    activeModal(resultAccountProxyListModal);
  }, [activeModal]);

  const onCloseAccountListModal = useCallback(() => {
    inactiveModal(resultAccountProxyListModal);
    setIsAccountListModalOpen(false);
  }, [inactiveModal]);

  const showAccountListModalTrigger = resultAccountProxies.length > 2;

  const getAccountListModalTriggerLabel = () => {
    if (resultAccountProxies.length === 3) {
      return t('And another');
    }

    return t('And {{number}} others', { replace: { number: resultAccountProxies.length - 2 } });
  };

  return (
    <>
      <div className={className}>
        <div className='__header-area'>
          {t('Success')}
        </div>

        <div className='__body-area'>
          <div className='__page-icon'>
            <PageIcon
              color='var(--page-icon-color)'
              iconProps={{
                weight: 'fill',
                phosphorIcon: CheckCircle
              }}
            />
          </div>

          <div className='__content-title'>
            {t('All done!')}
          </div>

          {
            !resultAccountProxies.length && (
              <div className='__brief'>
                {t('No account to migrate')}
              </div>
            )
          }

          {
            !!resultAccountProxies.length && (
              <>
                <div className='__brief'>
                  {t('You have successfully migrated')}

                  <br />

                  <span className={'__highlight'}>
                    {t('{{number}} unified accounts', { replace: { number: `${resultAccountProxies.length}`.padStart(2, '0') } })}
                  </span>
                </div>

                <div className='__account-list-container'>
                  {
                    resultAccountProxies.slice(0, 2).map((ap) => (
                      <ResultAccountProxyItem
                        className={'__account-item'}
                        key={ap.accountProxyId}
                        {...ap}
                      />
                    ))
                  }
                </div>

                {
                  showAccountListModalTrigger && (
                    <div className='__account-list-modal-trigger-wrapper'>
                      <button
                        className={'__account-list-modal-trigger'}
                        onClick={onOpenAccountListModal}
                      >
                        {getAccountListModalTriggerLabel()}
                      </button>
                    </div>
                  )
                }
              </>
            )
          }
        </div>

        <div className='__footer-area'>
          <Button
            block={true}
            icon={(
              <Icon
                phosphorIcon={CheckCircle}
                weight='fill'
              />
            )}
            onClick={onClickFinish}
          >
            {t('Finish')}
          </Button>
        </div>
      </div>

      {
        isAccountListModalOpen && showAccountListModalTrigger && (
          <ResultAccountProxyListModal
            accountProxies={resultAccountProxies}
            onClose={onCloseAccountListModal}
          />
        )
      }
    </>
  );
}

export const SummaryView = styled(Component)<Props>(({ theme: { extendToken, token } }: Props) => {
  return ({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',

    '.__header-area': {
      paddingLeft: token.padding,
      paddingRight: token.padding,
      paddingTop: 14,
      paddingBottom: 14,
      fontSize: token.fontSizeHeading4,
      lineHeight: token.lineHeightHeading4,
      textAlign: 'center',
      color: token.colorTextLight1
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

    '.__page-icon': {
      display: 'flex',
      justifyContent: 'center',
      marginBottom: token.margin,
      '--page-icon-color': token.colorSecondary
    },

    '.__content-title': {
      color: token.colorTextLight2,
      fontSize: token.fontSizeHeading3,
      lineHeight: token.lineHeightHeading3,
      textAlign: 'center',
      marginBottom: token.margin
    },

    '.__brief': {
      color: token.colorTextLight3,
      fontSize: token.fontSizeHeading5,
      lineHeight: token.lineHeightHeading5,
      textAlign: 'center',

      '.__highlight': {
        color: token.colorTextLight1
      }
    },

    '.__brief + .__account-list-container': {
      marginTop: 32
    },

    '.__account-item + .__account-item': {
      marginTop: token.marginXS
    },

    '.__account-list-modal-trigger-wrapper': {
      marginTop: token.marginXS,
      display: 'flex',
      justifyContent: 'center'
    },

    '.__account-list-modal-trigger': {
      padding: 0,
      cursor: 'pointer',
      backgroundColor: 'transparent',
      paddingLeft: token.padding,
      paddingRight: token.padding,
      border: 0,
      fontSize: token.fontSize,
      lineHeight: token.lineHeight,
      color: token.colorTextLight4
    }
  });
});
