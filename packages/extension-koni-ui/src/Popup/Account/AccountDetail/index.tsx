// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { CloseIcon, Layout, PageWrapper } from '@subwallet/extension-koni-ui/components';
import { FilterTabItemType, FilterTabs } from '@subwallet/extension-koni-ui/components/FilterTabs';
import { useGetAccountProxyById } from '@subwallet/extension-koni-ui/hooks';
import useNotification from '@subwallet/extension-koni-ui/hooks/common/useNotification';
import useDefaultNavigate from '@subwallet/extension-koni-ui/hooks/router/useDefaultNavigate';
import { editAccount } from '@subwallet/extension-koni-ui/messaging';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import { FormCallbacks, FormFieldData } from '@subwallet/extension-koni-ui/types/form';
import { convertFieldToObject } from '@subwallet/extension-koni-ui/utils/form/form';
import { Button, Form, Icon, Input } from '@subwallet/react-ui';
import CN from 'classnames';
import { CircleNotch, Export, FloppyDiskBack, GitMerge, Trash } from 'phosphor-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';

import { AccountAddressList } from './AccountAddressList';
import { DerivedAccountList } from './DerivedAccountList';

type Props = ThemeProps;

enum FormFieldName {
  NAME = 'name'
}

// @ts-ignore
enum ActionType {
  EXPORT = 'export',
  DERIVE = 'derive',
  DELETE = 'delete'
}

enum FilterTabType {
  ACCOUNT_ADDRESS = 'account-address',
  DERIVED_ACCOUNT = 'derived-account',
}

interface DetailFormState {
  [FormFieldName.NAME]: string;
}

const showDerivedAccounts = false;

const Component: React.FC<Props> = (props: Props) => {
  const { className } = props;

  const { t } = useTranslation();
  const navigate = useNavigate();
  const { goHome } = useDefaultNavigate();
  const notify = useNotification();
  const { accountProxyId } = useParams();

  const [selectedFilterTab, setSelectedFilterTab] = useState<string>(FilterTabType.ACCOUNT_ADDRESS);

  const [form] = Form.useForm<DetailFormState>();

  const accountProxy = useGetAccountProxyById(accountProxyId);

  const saveTimeOutRef = useRef<NodeJS.Timer>();

  // @ts-ignore
  const [deleting, setDeleting] = useState(false);
  // @ts-ignore
  const [deriving, setDeriving] = useState(false);
  const [saving, setSaving] = useState(false);

  const filterTabItems = useMemo<FilterTabItemType[]>(() => {
    const result = [
      {
        label: t('Account address'),
        value: FilterTabType.ACCOUNT_ADDRESS
      }
    ];

    if (showDerivedAccounts) {
      result.push({
        label: t('Derived account'),
        value: FilterTabType.DERIVED_ACCOUNT
      });
    }

    return result;
  }, [t]);

  const onSelectFilterTab = useCallback((value: string) => {
    setSelectedFilterTab(value);
  }, []);

  const onDelete = useCallback(() => {
    //
  }, []);

  const onDerive = useCallback(() => {
    //
  }, []);

  const onExport = useCallback(() => {
    //
  }, []);

  // @ts-ignore
  const onCopyAddress = useCallback(() => {
    notify({
      message: t('Copied to clipboard')
    });
  }, [notify, t]);

  const onUpdate: FormCallbacks<DetailFormState>['onFieldsChange'] = useCallback((changedFields: FormFieldData[], allFields: FormFieldData[]) => {
    const changeMap = convertFieldToObject<DetailFormState>(changedFields);

    if (changeMap[FormFieldName.NAME]) {
      clearTimeout(saveTimeOutRef.current);
      setSaving(true);
      saveTimeOutRef.current = setTimeout(() => {
        form.submit();
      }, 1000);
    }
  }, [form]);

  const onSubmit: FormCallbacks<DetailFormState>['onFinish'] = useCallback((values: DetailFormState) => {
    clearTimeout(saveTimeOutRef.current);
    const name = values[FormFieldName.NAME];

    if (!accountProxy || name === accountProxy.name) {
      setSaving(false);

      return;
    }

    const accountProxyId = accountProxy.id;

    if (!accountProxyId) {
      setSaving(false);

      return;
    }

    editAccount(accountProxyId, name.trim())
      .catch(console.error)
      .finally(() => {
        setSaving(false);
      });
  }, [accountProxy]);

  const footerNode = (() => {
    return <>
      <Button
        className={CN('account-button')}
        disabled={false}
        icon={(
          <Icon
            phosphorIcon={Trash}
            weight='fill'
          />
        )}
        loading={deleting}
        onClick={onDelete}
        schema='error'
      />
      <Button
        block={true}
        className={CN('account-button')}
        disabled={false}
        icon={(
          <Icon
            phosphorIcon={GitMerge}
            weight='fill'
          />
        )}
        loading={deriving}
        onClick={onDerive}
        schema='secondary'
      >
        {t('Derive')}
      </Button>
      <Button
        block={true}
        className={CN('account-button')}
        disabled={false}
        icon={(
          <Icon
            phosphorIcon={Export}
            weight='fill'
          />
        )}
        onClick={onExport}
        schema='secondary'
      >
        {t('Export')}
      </Button>
    </>;
  })();

  useEffect(() => {
    if (!accountProxy) {
      goHome();
    }
  }, [accountProxy, goHome, navigate]);

  if (!accountProxy) {
    return null;
  }

  return (
    <PageWrapper
      className={CN(className)}
    >
      <Layout.WithSubHeaderOnly
        disableBack={false}
        footer={footerNode}
        subHeaderIcons={[
          {
            icon: <CloseIcon />,
            onClick: goHome,
            disabled: false
          }
        ]}
        title={t('Account details')}
      >
        <Form
          className={'account-detail-form'}
          form={form}
          initialValues={{
            [FormFieldName.NAME]: accountProxy.name || ''
          }}
          name='account-detail-form'
          onFieldsChange={onUpdate}
          onFinish={onSubmit}
        >
          <Form.Item
            className={CN('account-field')}
            name={FormFieldName.NAME}
            rules={[
              {
                message: t('Account name is required'),
                transform: (value: string) => value.trim(),
                required: true
              }
            ]}
            statusHelpAsTooltip={true}
          >
            <Input
              className='account-name-input'
              disabled={false}
              label={t('Account name')}
              onBlur={form.submit}
              placeholder={t('Account name')}
              suffix={(
                <Icon
                  className={CN({ loading: saving })}
                  phosphorIcon={saving ? CircleNotch : FloppyDiskBack}
                  size='sm'
                />
              )}
            />
          </Form.Item>
        </Form>

        <FilterTabs
          className={'filter-tabs-container'}
          items={filterTabItems}
          onSelect={onSelectFilterTab}
          selectedItem={selectedFilterTab}
        />
        {
          selectedFilterTab === FilterTabType.ACCOUNT_ADDRESS && (
            <AccountAddressList
              accountProxy={accountProxy}
              className={'list-container'}
            />
          )
        }
        {
          selectedFilterTab === FilterTabType.DERIVED_ACCOUNT && (
            <DerivedAccountList className={'list-container'} />
          )
        }
      </Layout.WithSubHeaderOnly>
    </PageWrapper>
  );
};

const AccountDetail = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {
    '.ant-sw-screen-layout-body': {
      display: 'flex',
      overflow: 'hidden',
      flexDirection: 'column'
    },

    '.ant-sw-screen-layout-footer': {
      paddingTop: token.paddingSM,
      paddingBottom: 24
    },

    '.ant-sw-screen-layout-footer-content': {
      display: 'flex',
      gap: token.sizeSM
    },

    '.account-detail-form': {
      paddingTop: token.padding,
      paddingLeft: token.padding,
      paddingRight: token.padding
    },

    '.account-detail-form .ant-form-item': {
      marginBottom: 0
    },

    '.account-name-input .ant-input-suffix .anticon': {
      minWidth: 40,
      justifyContent: 'center'
    },

    '.list-container': {
      flex: 1
    },

    '.filter-tabs-container': {
      gap: 0,
      paddingLeft: token.paddingXXS,
      paddingRight: token.paddingXXS,

      '.__tab-item:after': {
        display: 'none'
      },

      '.__tab-item-label': {
        padding: token.paddingSM,
        lineHeight: '20px',
        fontSize: '11px',
        textTransform: 'uppercase'
      }
    }
  };
});

export default AccountDetail;
