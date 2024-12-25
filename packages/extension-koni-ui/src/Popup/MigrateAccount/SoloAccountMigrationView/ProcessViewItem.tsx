// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { SoloAccountToBeMigrated } from '@subwallet/extension-base/background/KoniTypes';
import { AccountProxyType } from '@subwallet/extension-base/types';
import { AccountProxyTypeTag } from '@subwallet/extension-koni-ui/components';
import { useTranslation } from '@subwallet/extension-koni-ui/hooks';
import { validateAccountName } from '@subwallet/extension-koni-ui/messaging';
import { SoloAccountToBeMigratedItem } from '@subwallet/extension-koni-ui/Popup/MigrateAccount/SoloAccountMigrationView/SoloAccountToBeMigratedItem';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import { noop } from '@subwallet/extension-koni-ui/utils';
import { Button, Form, Icon, Input } from '@subwallet/react-ui';
import CN from 'classnames';
import { CheckCircle, XCircle } from 'phosphor-react';
import { RuleObject } from 'rc-field-form/lib/interface';
import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';

type Props = ThemeProps & {
  currentProcessOrdinal: number;
  totalProcessSteps: number;
  currentSoloAccountToBeMigratedGroup: SoloAccountToBeMigrated[];
  onSkip: VoidFunction;
  onApprove: (soloAccounts: SoloAccountToBeMigrated[], accountName: string) => Promise<void>;
};

interface FormProps {
  name: string;
}

function Component ({ className = '', currentProcessOrdinal, currentSoloAccountToBeMigratedGroup, onApprove, onSkip, totalProcessSteps }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<FormProps>();
  const defaultValues = useMemo(() => ({
    name: ''
  }), []);

  const headerContent = useMemo(() => {
    return `${t('Migrated account')}: ${currentProcessOrdinal}/${totalProcessSteps}`;
  }, [currentProcessOrdinal, t, totalProcessSteps]);

  const _onApprove = useCallback(() => {
    const doApprove = () => {
      setLoading(true);

      const { name } = form.getFieldsValue();

      onApprove(currentSoloAccountToBeMigratedGroup, name)
        .catch(console.error)
        .finally(() => {
          setLoading(false);
        });
    };

    form.validateFields(['name']).then(() => {
      doApprove();
    }).catch(noop);
  }, [currentSoloAccountToBeMigratedGroup, form, onApprove]);

  const accountNameValidator = useCallback(async (validate: RuleObject, value: string) => {
    if (value) {
      try {
        const { isValid } = await validateAccountName({ name: value });

        if (!isValid) {
          return Promise.reject(t('Account name already in use'));
        }
      } catch (e) {
        return Promise.reject(t('Account name invalid'));
      }
    }

    return Promise.resolve();
  }, [t]);

  return (
    <div className={className}>
      <div className='__header-area'>
        {headerContent}
      </div>

      <div className='__body-area'>
        <div className='__brief'>
          {t('Enter a name for the unified account to complete the migration process')}
        </div>

        <div className='__section-label'>
          {t('Migrate from')}
        </div>

        <div className='__account-list'>
          {
            currentSoloAccountToBeMigratedGroup.map((account) => (
              <SoloAccountToBeMigratedItem
                className={'__account-item'}
                key={account.address}
                {...account}
              />
            ))
          }
        </div>

        <div className='__section-label'>
          {t('To')}
        </div>

        <Form
          form={form}
          initialValues={defaultValues}
          name='__form-container'
        >
          <div className='__account-name-field-wrapper'>
            <div className='__account-type-tag-wrapper'>
              <AccountProxyTypeTag
                className={'__account-type-tag'}
                type={AccountProxyType.UNIFIED}
              />
            </div>

            <Form.Item
              className={CN('__account-name-field')}
              name={'name'}
              rules={[
                {
                  message: t('Account name is required'),
                  transform: (value: string) => value.trim(),
                  required: true
                },
                {
                  validator: accountNameValidator
                }
              ]}
              statusHelpAsTooltip={true}
            >
              <Input
                className='__account-name-input'
                disabled={loading}
                label={t('Account name')}
                placeholder={t('Enter the account name')}
              />
            </Form.Item>
          </div>
        </Form>
      </div>

      <div className='__footer-area'>
        <Button
          block={true}
          disabled={loading}
          icon={(
            <Icon
              phosphorIcon={XCircle}
              weight='fill'
            />
          )}
          onClick={onSkip}
          schema={'secondary'}
        >
          {t('Skip')}
        </Button>
        <Button
          block={true}
          disabled={loading}
          icon={(
            <Icon
              phosphorIcon={CheckCircle}
              weight='fill'
            />
          )}
          loading={loading}
          onClick={_onApprove}
        >
          {t('Approve')}
        </Button>
      </div>
    </div>
  );
}

export const ProcessViewItem = styled(Component)<Props>(({ theme: { extendToken, token } }: Props) => {
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

    '.__brief': {
      textAlign: 'center',
      fontSize: token.fontSize,
      color: token.colorTextLight4,
      lineHeight: token.lineHeight,
      marginBottom: token.margin
    },

    '.__section-label': {
      fontSize: token.fontSize,
      color: token.colorTextLight4,
      lineHeight: token.lineHeight,
      marginBottom: token.marginXS,
      fontWeight: token.headingFontWeight
    },

    '.__account-list': {
      marginBottom: token.margin
    },

    '.__account-item + .__account-item': {
      marginTop: token.marginXS
    },

    '.__account-name-field-wrapper': {
      position: 'relative'
    },

    '.__account-name-field': {
      marginBottom: 0
    },

    '.__account-type-tag-wrapper': {
      position: 'absolute',
      zIndex: 1,
      right: token.sizeSM,
      top: token.sizeXS,
      display: 'flex'
    },

    '.__account-type-tag': {
      marginRight: 0
    }
  });
});
