// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { CloseIcon, Layout, PageWrapper, PrivateKeyInput } from '@subwallet/extension-koni-ui/components';
import { EVM_ACCOUNT_TYPE } from '@subwallet/extension-koni-ui/constants';
import { IMPORT_ACCOUNT_MODAL } from '@subwallet/extension-koni-ui/constants/modal';
import { useAutoNavigateToCreatePassword, useCompleteCreateAccount, useDefaultNavigate, useFocusFormItem, useGoBackFromCreateAccount, useTranslation, useUnlockChecker } from '@subwallet/extension-koni-ui/hooks';
import { createAccountSuriV2, validateMetamaskPrivateKeyV2 } from '@subwallet/extension-koni-ui/messaging';
import { FormCallbacks, ThemeProps, ValidateState } from '@subwallet/extension-koni-ui/types';
import { simpleCheckForm } from '@subwallet/extension-koni-ui/utils';
import { Button, Form, Icon, Input } from '@subwallet/react-ui';
import CN from 'classnames';
import { Eye, EyeSlash, FileArrowDown } from 'phosphor-react';
import { Callbacks, FieldData } from 'rc-field-form/lib/interface';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

type Props = ThemeProps;

const FooterIcon = (
  <Icon
    phosphorIcon={FileArrowDown}
    weight='fill'
  />
);

const formName = 'import-private-key-form';
const fieldPrivateKey = 'private-key';

interface FormState {
  [fieldPrivateKey]: string;
  name: string;
}

const Component: React.FC<Props> = ({ className }: Props) => {
  useAutoNavigateToCreatePassword();

  const { t } = useTranslation();
  const { goHome } = useDefaultNavigate();
  const onComplete = useCompleteCreateAccount();
  const onBack = useGoBackFromCreateAccount(IMPORT_ACCOUNT_MODAL);

  const timeOutRef = useRef<NodeJS.Timer>();

  // TODO: Change way validate
  const [validateState, setValidateState] = useState<ValidateState>({});
  const [validating, setValidating] = useState(false);
  const [isDisable, setIsDisable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [privateKeyChanged, setPrivateKeyChanged] = useState(false);
  const [form] = Form.useForm<FormState>();
  const checkUnlock = useUnlockChecker();

  // Auto-focus field
  useFocusFormItem(form, fieldPrivateKey);

  const privateKey = Form.useWatch(fieldPrivateKey, form);

  const onSubmit: FormCallbacks<FormState>['onFinish'] = useCallback((values: FormState) => {
    const { name: accountName, [fieldPrivateKey]: privateKey } = values;

    checkUnlock().then(() => {
      if (privateKey?.trim()) {
        setLoading(true);
        createAccountSuriV2({
          name: accountName,
          suri: privateKey.trim(),
          isAllowed: true,
          type: EVM_ACCOUNT_TYPE
        })
          .then(() => {
            onComplete();
          })
          .catch((error: Error): void => {
            setValidateState({
              status: 'error',
              message: error.message
            });
          })
          .finally(() => {
            setLoading(false);
          });
      }
    })
      .catch(() => {
        // User cancel unlock
      });
  }, [checkUnlock, onComplete]);

  useEffect(() => {
    let amount = true;

    if (timeOutRef.current) {
      clearTimeout(timeOutRef.current);
    }

    if (amount) {
      if (privateKey?.trim()) {
        setValidating(true);
        setValidateState({
          status: 'validating',
          message: ''
        });

        timeOutRef.current = setTimeout(() => {
          validateMetamaskPrivateKeyV2(privateKey.trim())
            .then(({ autoAddPrefix }) => {
              if (amount) {
                if (autoAddPrefix) {
                  form.setFieldValue(fieldPrivateKey, `0x${privateKey}`);
                }

                setValidateState({});
              }
            })
            .catch((e: Error) => {
              if (amount) {
                setValidateState({
                  status: 'error',
                  message: e.message
                });
              }
            })
            .finally(() => {
              if (amount) {
                setValidating(false);
              }
            });
        }, 300);
      } else {
        if (privateKeyChanged) {
          setValidateState({
            status: 'error',
            message: t('Private key is required')
          });
        }
      }
    }

    return () => {
      amount = false;
    };
  }, [privateKey, form, privateKeyChanged, t]);

  const onValuesChange: FormCallbacks<FormState>['onValuesChange'] = useCallback((changedValues: Partial<FormState>) => {
    if (fieldPrivateKey in changedValues) {
      setPrivateKeyChanged(true);
    }
  }, []);

  const onFieldsChange: Callbacks<FormState>['onFieldsChange'] = useCallback((changes: FieldData[], allFields: FieldData[]) => {
    const { empty, error } = simpleCheckForm(allFields);

    setIsDisable(error || empty);
  }, []);

  const toggleShow = useCallback(() => {
    setShow((value) => !value);
  }, []);

  return (
    <PageWrapper className={CN(className)}>
      <Layout.WithSubHeaderOnly
        onBack={onBack}
        rightFooterButton={{
          children: validating ? t('Validating') : t('Import account'),
          icon: FooterIcon,
          onClick: form.submit,
          disabled: !privateKey || !!validateState.status || isDisable,
          loading: validating || loading
        }}
        subHeaderIcons={[
          {
            icon: <CloseIcon />,
            onClick: goHome
          }
        ]}
        title={t<string>('Import from private key')}
      >
        <div className='container'>
          <div className='description'>
            {t('To import an existing wallet, please enter private key')}
          </div>
          <Form
            className='form-container'
            form={form}
            initialValues={{ [fieldPrivateKey]: '', name: '' }}
            name={formName}
            onFieldsChange={onFieldsChange}
            onFinish={onSubmit}
            onValuesChange={onValuesChange}
          >
            <Form.Item
              name={fieldPrivateKey}
              validateStatus={validateState.status}
            >
              <PrivateKeyInput
                className='private-key-input'
                hideText={!show}
                label={t('Private key')}
                placeholder={t('Enter private key')}
                statusHelp={validateState.message}
              />
            </Form.Item>
            <Form.Item
              className={CN('__account-name-field')}
              name={'name'}
              rules={[{
                message: t('Account name is required'),
                transform: (value: string) => value.trim(),
                required: true
              }]}
            >
              <Input
                className='__account-name-input'
                disabled={loading}
                label={t('Account name')}
                placeholder={t('Enter the account name')}
              />
            </Form.Item>
            <div className='button-container'>
              <Button
                icon={(
                  <Icon
                    phosphorIcon={show ? EyeSlash : Eye}
                    size='sm'
                  />
                )}
                onClick={toggleShow}
                size='xs'
                type='ghost'
              >
                {show ? t('Hide private key') : t('Show private key')}
              </Button>
            </div>
          </Form>
        </div>
      </Layout.WithSubHeaderOnly>
    </PageWrapper>
  );
};

const ImportPrivateKey = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {
    '.container': {
      padding: token.padding
    },

    '.description': {
      padding: `0 ${token.padding}px`,
      fontSize: token.fontSizeHeading6,
      lineHeight: token.lineHeightHeading6,
      color: token.colorTextDescription,
      textAlign: 'center'
    },

    '.form-container': {
      marginTop: token.margin
    },

    '.button-container': {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center'
    }
  };
});

export default ImportPrivateKey;
