// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountProxyType } from '@subwallet/extension-base/types';
import { AccountNameModal, CloseIcon, Layout, PageWrapper, PrivateKeyInput } from '@subwallet/extension-koni-ui/components';
import { ACCOUNT_NAME_MODAL, IMPORT_ACCOUNT_MODAL } from '@subwallet/extension-koni-ui/constants/modal';
import { useAutoNavigateToCreatePassword, useCompleteCreateAccount, useDefaultNavigate, useFocusFormItem, useGoBackFromCreateAccount, useTranslation, useUnlockChecker } from '@subwallet/extension-koni-ui/hooks';
import { createAccountSuriV2, validateMetamaskPrivateKeyV2 } from '@subwallet/extension-koni-ui/messaging';
import { FormCallbacks, ThemeProps, ValidateState } from '@subwallet/extension-koni-ui/types';
import { Button, Form, Icon, ModalContext } from '@subwallet/react-ui';
import CN from 'classnames';
import { Eye, EyeSlash, FileArrowDown } from 'phosphor-react';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

type Props = ThemeProps;

const FooterIcon = (
  <Icon
    phosphorIcon={FileArrowDown}
    weight='fill'
  />
);

const formName = 'import-private-key-form';
const fieldName = 'private-key';

interface FormState {
  [fieldName]: string;
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
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [changed, setChanged] = useState(false);
  const { activeModal, inactiveModal } = useContext(ModalContext);
  const [form] = Form.useForm<FormState>();
  const checkUnlock = useUnlockChecker();

  // Auto-focus field
  useFocusFormItem(form, fieldName);

  const privateKey = Form.useWatch(fieldName, form);

  const onSubmit: FormCallbacks<FormState>['onFinish'] = useCallback((values: FormState) => {
    const { [fieldName]: privateKey } = values;

    checkUnlock().then(() => {
      if (privateKey?.trim()) {
        activeModal(ACCOUNT_NAME_MODAL);
      }
    })
      .catch(() => {
      // User cancel unlock
      });
  }, [checkUnlock, activeModal]);

  const onSubmitFinal = useCallback((name: string) => {
    if (privateKey?.trim()) {
      setLoading(true);
      createAccountSuriV2({
        name: name,
        suri: privateKey.trim(),
        isAllowed: true
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
          inactiveModal(ACCOUNT_NAME_MODAL);
          setLoading(false);
        });
    }
  }, [privateKey, onComplete, inactiveModal]);

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
                  form.setFieldValue(fieldName, `0x${privateKey}`);
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
        if (changed) {
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
  }, [privateKey, form, changed, t]);

  const onValuesChange: FormCallbacks<FormState>['onValuesChange'] = useCallback((changedValues: Partial<FormState>) => {
    if (fieldName in changedValues) {
      setChanged(true);
    }
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
          disabled: !privateKey || !!validateState.status,
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
            initialValues={{ [fieldName]: '' }}
            name={formName}
            onFinish={onSubmit}
            onValuesChange={onValuesChange}
          >
            <Form.Item
              name={fieldName}
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

        <AccountNameModal
          accountType={AccountProxyType.SOLO}
          isLoading={loading}
          onSubmit={onSubmitFinal}
        />
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
