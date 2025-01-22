// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { useTranslation } from '@subwallet/extension-koni-ui/hooks';
import { FormCallbacks, ThemeProps, VoidFunction } from '@subwallet/extension-koni-ui/types';
import { Button, Form, Icon, Input, SwModal } from '@subwallet/react-ui';
import { ArrowCircleRight, XCircle } from 'phosphor-react';
import React, { useCallback, useState } from 'react';
import styled from 'styled-components';

import useFocusById from '../../hooks/form/useFocusById';

type Props = ThemeProps & {
  onClose: VoidFunction;
  onSubmit: (password: string) => Promise<void>;
}

export const enterPasswordModalId = 'enterPasswordModalId';

const passwordInputId = 'enter-password-input-id';

enum FormFieldName {
  PASSWORD = 'password'
}

interface LoginFormState {
  [FormFieldName.PASSWORD]: string;
}

function Component ({ className = '', onClose, onSubmit }: Props): React.ReactElement<Props> {
  const { t } = useTranslation();
  const [form] = Form.useForm<LoginFormState>();
  const [loading, setLoading] = useState(false);

  const onError = useCallback((error: string) => {
    form.setFields([{ name: FormFieldName.PASSWORD, errors: [error] }]);
    (document.getElementById(passwordInputId) as HTMLInputElement)?.select();
  }, [form]);

  const _onSubmit: FormCallbacks<LoginFormState>['onFinish'] = useCallback((values: LoginFormState) => {
    setLoading(true);
    setTimeout(() => {
      onSubmit(values[FormFieldName.PASSWORD])
        .catch((e: Error) => {
          onError(e.message);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 500);
  }, [onError, onSubmit]);

  useFocusById(passwordInputId);

  return (
    <SwModal
      className={className}
      closable={false}
      footer={(
        <>
          <Button
            block={true}
            disabled={loading}
            icon={(
              <Icon
                phosphorIcon={XCircle}
                weight='fill'
              />
            )}
            onClick={onClose}
            schema={'secondary'}
          >
            {t('Cancel')}
          </Button>
          <Button
            block={true}
            disabled={loading}
            icon={(
              <Icon
                phosphorIcon={ArrowCircleRight}
                weight='fill'
              />
            )}
            loading={loading}
            onClick={form.submit}
          >
            {t('Continue')}
          </Button>
        </>
      )}
      id={enterPasswordModalId}
      title={t('Enter password')}
      zIndex={9999}
    >
      <div className='__brief'>
        {t('Enter your SubWallet password to continue')}
      </div>

      <Form
        form={form}
        initialValues={{ [FormFieldName.PASSWORD]: '' }}
        onFinish={_onSubmit}
      >
        <Form.Item
          name={FormFieldName.PASSWORD}
          rules={[
            {
              message: t('Password is required'),
              required: true
            }
          ]}
          statusHelpAsTooltip={true}
        >
          <Input.Password
            containerClassName='__password-input'
            id={passwordInputId}
            label={t('Password')}
            placeholder={t('Enter password')}
            suffix={<span />}
          />
        </Form.Item>
      </Form>
    </SwModal>
  );
}

export const EnterPasswordModal = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return ({
    '.ant-sw-modal-body': {
      paddingBottom: 0
    },

    '.ant-sw-modal-footer': {
      borderTop: 0,
      display: 'flex',
      gap: token.sizeXXS
    },

    '.ant-form-item': {
      marginBottom: 0
    },

    '.__brief': {
      textAlign: 'center',
      fontSize: token.fontSize,
      color: token.colorTextLight4,
      lineHeight: token.lineHeight,
      marginBottom: token.margin
    },

    '.__password-input': {
      '.ant-input-prefix': {
        display: 'none'
      }
    }
  });
});
