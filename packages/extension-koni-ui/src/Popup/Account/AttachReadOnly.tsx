// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountExternalErrorCode } from '@subwallet/extension-base/background/KoniTypes';
import { isSameAddress } from '@subwallet/extension-base/utils';
import { Layout, PageWrapper } from '@subwallet/extension-koni-ui/components';
import { AddressInput } from '@subwallet/extension-koni-ui/components/Field/AddressInput';
import CloseIcon from '@subwallet/extension-koni-ui/components/Icon/CloseIcon';
import { ATTACH_ACCOUNT_MODAL } from '@subwallet/extension-koni-ui/constants/modal';
import useCompleteCreateAccount from '@subwallet/extension-koni-ui/hooks/account/useCompleteCreateAccount';
import useGoBackFromCreateAccount from '@subwallet/extension-koni-ui/hooks/account/useGoBackFromCreateAccount';
import useFocusById from '@subwallet/extension-koni-ui/hooks/form/useFocusById';
import useAutoNavigateToCreatePassword from '@subwallet/extension-koni-ui/hooks/router/useAutoNavigateToCreatePassword';
import useDefaultNavigate from '@subwallet/extension-koni-ui/hooks/router/useDefaultNavigate';
import { createAccountExternalV2, validateAccountName } from '@subwallet/extension-koni-ui/messaging';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import { convertFieldToObject, simpleCheckForm } from '@subwallet/extension-koni-ui/utils/form/form';
import { readOnlyScan } from '@subwallet/extension-koni-ui/utils/scanner/attach';
import { Form, Icon, Input, PageIcon } from '@subwallet/react-ui';
import CN from 'classnames';
import { Eye } from 'phosphor-react';
import { Callbacks, FieldData, RuleObject } from 'rc-field-form/lib/interface';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import styled from 'styled-components';

type Props = ThemeProps;

interface ReadOnlyAccountInput {
  address?: string;
  name: string;
}

const FooterIcon = (
  <Icon
    phosphorIcon={Eye}
    weight='fill'
  />
);

const modalId = 'attach-read-only-scanner-modal';
const formName = 'attach-read-only-form';
const fieldName = 'address';

const Component: React.FC<Props> = ({ className }: Props) => {
  useAutoNavigateToCreatePassword();

  const { t } = useTranslation();
  const { goHome } = useDefaultNavigate();
  const onComplete = useCompleteCreateAccount();

  const accounts = useSelector((root: RootState) => root.accountState.accounts);

  const onBack = useGoBackFromCreateAccount(ATTACH_ACCOUNT_MODAL);

  const [form] = Form.useForm<ReadOnlyAccountInput>();

  const [reformatAddress, setReformatAddress] = useState('');
  const [isHideAccountNameInput, setIsHideAccountNameInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDisable, setIsDisable] = useState(true);

  const handleResult = useCallback((val: string) => {
    // Todo: Recheck this logic with master account
    const result = readOnlyScan(val);

    if (result) {
      setReformatAddress(result.content);
    }
  }, []);

  const onFieldsChange: Callbacks<ReadOnlyAccountInput>['onFieldsChange'] = useCallback((changes: FieldData[], allFields: FieldData[]) => {
    const { empty, error } = simpleCheckForm(allFields);

    setIsDisable(error || empty);

    const changeMap = convertFieldToObject<ReadOnlyAccountInput>(changes);

    if (changeMap.address) {
      handleResult(changeMap.address);
    }
  }, [handleResult]);

  const accountAddressValidator = useCallback((rule: RuleObject, value: string) => {
    const result = readOnlyScan(value);

    if (result) {
      // For each account, check if the address already exists return promise reject
      for (const account of accounts) {
        if (isSameAddress(account.address, result.content)) {
          setReformatAddress('');
          setIsHideAccountNameInput(true);

          return Promise.reject(t('Account already exists'));
        }
      }
    } else {
      setReformatAddress('');
      setIsHideAccountNameInput(true);

      if (value !== '') {
        return Promise.reject(t('Invalid address'));
      }
    }

    setIsHideAccountNameInput(false);

    return Promise.resolve();
  }, [accounts, t]);

  const accountNameValidator = useCallback(async (rule: RuleObject, value: string) => {
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

  const onSubmit = useCallback(() => {
    setLoading(true);
    const accountName = form.getFieldValue('name') as string;

    if (reformatAddress && accountName) {
      createAccountExternalV2({
        name: accountName,
        address: reformatAddress,
        genesisHash: '',
        isAllowed: true,
        isReadOnly: true
      })
        .then((errors) => {
          if (errors.length) {
            const errorNameInputs: string[] = [];
            const errorAddressInputs: string[] = [];

            errors.forEach((error) => {
              if (error.code === AccountExternalErrorCode.INVALID_ADDRESS) {
                errorAddressInputs.push(error.message);
              } else if (error.message.toLowerCase().includes('account name already exists')) {
                errorNameInputs.push(error.message);
              } else {
                errorAddressInputs.push(t('Invalid address'));
              }
            });

            form.setFields([
              { name: 'address', errors: errorAddressInputs.length ? errorAddressInputs : undefined },
              { name: 'name', errors: errorNameInputs.length ? errorNameInputs : undefined }
            ]);
          } else {
            onComplete();
          }
        })
        .catch((error: Error) => {
          form.setFields([{ name: 'name', errors: [error.message] }]);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [form, reformatAddress, t, onComplete]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter') {
      form.submit();
    }
  }, [form]);

  useFocusById(modalId);

  return (
    <PageWrapper className={CN(className)}>
      <Layout.WithSubHeaderOnly
        onBack={onBack}
        rightFooterButton={{
          children: t('Attach watch-only account'),
          icon: FooterIcon,
          disabled: isDisable,
          onClick: onSubmit,
          loading: loading
        }}
        subHeaderIcons={[
          {
            icon: <CloseIcon />,
            onClick: goHome
          }
        ]}
        title={t<string>('Attach watch-only account')}
      >
        <div className={CN('container')}>
          <div className='description'>
            {t('Track the activity of any wallet without a private key')}
          </div>
          <div className='page-icon'>
            <PageIcon
              color='var(--page-icon-color)'
              iconProps={{
                weight: 'fill',
                phosphorIcon: Eye
              }}
            />
          </div>
          <Form
            form={form}
            initialValues={{ address: '', name: '' }}
            name={formName}
            onFieldsChange={onFieldsChange}
            onFinish={onSubmit}
            onKeyDown={handleKeyDown}
          >
            <Form.Item
              name={fieldName}
              rules={[
                {
                  message: t('Account address is required'),
                  required: true
                },
                {
                  validator: accountAddressValidator
                }
              ]}
              statusHelpAsTooltip={true}
            >
              <AddressInput
                id={modalId}
                placeholder={t('Please type or paste account address')}
                showScanner={true}
              />
            </Form.Item>

            <Form.Item
              className={CN('__account-name-field')}
              hidden={isHideAccountNameInput}
              name={'name'}
              rules={[{
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
          </Form>
        </div>
      </Layout.WithSubHeaderOnly>
    </PageWrapper>
  );
};

const AttachReadOnly = styled(Component)<Props>(({ theme: { token } }: Props) => {
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

    '.page-icon': {
      display: 'flex',
      justifyContent: 'center',
      marginTop: token.controlHeightLG,
      marginBottom: token.sizeXXL,
      '--page-icon-color': token.colorSecondary
    }
  };
});

export default AttachReadOnly;
