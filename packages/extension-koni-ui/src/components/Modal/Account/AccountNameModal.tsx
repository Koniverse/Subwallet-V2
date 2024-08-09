// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountProxyType } from '@subwallet/extension-base/types';
import { ACCOUNT_NAME_MODAL } from '@subwallet/extension-koni-ui/constants';
import { useTranslation } from '@subwallet/extension-koni-ui/hooks';
import { FormCallbacks, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { Button, Form, Icon, Input, SwModal } from '@subwallet/react-ui';
import CN from 'classnames';
import { CheckCircle } from 'phosphor-react';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';

type Props = ThemeProps & {
  isLoading?: boolean;
  accountType?: AccountProxyType; // for display account proxy tag
  onSubmit?: (name: string) => void
};

interface FormProps {
  name: string;
}

const modalId = ACCOUNT_NAME_MODAL;

// todo: use prop accountType to make the account type tag (at top of account name input)
const Component: React.FC<Props> = ({ className, isLoading, onSubmit }: Props) => {
  const { t } = useTranslation();
  const [form] = Form.useForm<FormProps>();
  const defaultValues = useMemo(() => ({
    name: ''
  }), []);

  const accountNameValue = Form.useWatch('name', form);

  const accountNameRules = useMemo(() => {
    return [
      {
        message: t('Account name is required'),
        transform: (value: string) => value.trim(),
        required: true
      }
    ];
  }, [t]);

  const _onSubmit: FormCallbacks<FormProps>['onFinish'] = useCallback(({ name }: FormProps) => {
    onSubmit?.(name);
  }, [onSubmit]);

  return (
    <SwModal
      className={CN(className)}
      closable={false}
      id={modalId}
      maskClosable={false}
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
      >
        {/* todo: account type tag will be here */}
        <Form.Item
          className={CN('__account-name-field')}
          name={'name'}
          rules={accountNameRules}
        >
          <Input
            className='__account-name-input'
            disabled={isLoading}
            label={t('Account name')}
            onBlur={form.submit}
            placeholder={t('Enter the account name')}
          />
        </Form.Item>
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
    }
  };
});

export default AccountNameModal;
