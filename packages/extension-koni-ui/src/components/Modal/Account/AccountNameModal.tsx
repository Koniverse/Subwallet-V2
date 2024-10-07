// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountProxyType } from '@subwallet/extension-base/types';
import { AccountProxyTypeTag } from '@subwallet/extension-koni-ui/components';
import { ACCOUNT_NAME_MODAL } from '@subwallet/extension-koni-ui/constants';
import { useTranslation } from '@subwallet/extension-koni-ui/hooks';
import { validateAccountName } from '@subwallet/extension-koni-ui/messaging';
import { FormCallbacks, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { Button, Form, Icon, Input, ModalContext, SwModal } from '@subwallet/react-ui';
import CN from 'classnames';
import { CheckCircle } from 'phosphor-react';
import { RuleObject } from 'rc-field-form/lib/interface';
import React, { useCallback, useContext, useEffect, useMemo } from 'react';
import styled from 'styled-components';

type Props = ThemeProps & {
  isLoading?: boolean;
  accountType?: AccountProxyType; // for display account proxy tag
  onSubmit?: (name: string) => void;
  onCancel?: () => void;
  closeable?: boolean;
  modalId?: string;
};

interface FormProps {
  name: string;
}

const Component: React.FC<Props> = ({ accountType, className, isLoading, onSubmit, onCancel, closeable = false, modalId = ACCOUNT_NAME_MODAL }: Props) => {
  const { t } = useTranslation();
  const [form] = Form.useForm<FormProps>();
  const { checkActive } = useContext(ModalContext);
  const isActive = useMemo(() => checkActive(modalId), [checkActive, modalId]);
  const defaultValues = useMemo(() => ({
    name: ''
  }), []);

  const accountNameValue = Form.useWatch('name', form);

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

  const _onSubmit: FormCallbacks<FormProps>['onFinish'] = useCallback(({ name }: FormProps) => {
    onSubmit?.(name);
  }, [onSubmit]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter') {
      form.submit();
    }
  }, [form]);

  useEffect(() => {
    if (!isActive) {
      form.resetFields(['name']);
    }
  }, [form, isActive]);

  return (
    <SwModal
      className={CN(className)}
      closable={closeable}
      id={modalId}
      maskClosable={false}
      onCancel={onCancel}
      title={t<string>('Account name')}
    >
      <div className={'__brief'}>
        {t('Enter a name for your account.\n You can edit this later.')}
      </div>

      <Form
        form={form}
        initialValues={defaultValues}
        name='__form-container'
        onFinish={_onSubmit}
        onKeyDown={handleKeyDown}
      >
        <div className='__account-name-field-wrapper'>
          <div className='__account-type-tag-wrapper'>
            {
              accountType && (
                <AccountProxyTypeTag
                  className={'__account-type-tag'}
                  type={accountType}
                />
              )
            }
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
              disabled={isLoading}
              label={t('Account name')}
              placeholder={t('Enter the account name')}
            />
          </Form.Item>
        </div>
      </Form>

      <div className='__submit-button-wrapper'>
        <Button
          block={true}
          className='__submit-button'
          disabled={!accountNameValue || isLoading}
          icon={(
            <Icon
              phosphorIcon={CheckCircle}
            />
          )}
          loading={isLoading}
          onClick={form.submit}
        >
          {t('Confirm')}
        </Button>
      </div>
    </SwModal>
  );
};

const AccountNameModal = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {
    '.__brief': {
      color: token.colorTextLight4,
      whiteSpace: 'pre-wrap',
      textAlign: 'center',
      marginBottom: token.margin
    },

    '.__account-name-field-wrapper': {
      position: 'relative'
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
  };
});

export default AccountNameModal;
