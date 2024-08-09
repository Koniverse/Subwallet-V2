// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NotificationType } from '@subwallet/extension-base/background/KoniTypes';
import { AccountProxy, AccountProxyType } from '@subwallet/extension-base/types';
import { AccountProxyTypeTag, CloseIcon, Layout, PageWrapper } from '@subwallet/extension-koni-ui/components';
import { FilterTabItemType, FilterTabs } from '@subwallet/extension-koni-ui/components/FilterTabs';
import { WalletModalContext } from '@subwallet/extension-koni-ui/contexts/WalletModalContextProvider';
import { useGetAccountProxyById } from '@subwallet/extension-koni-ui/hooks';
import useNotification from '@subwallet/extension-koni-ui/hooks/common/useNotification';
import useDefaultNavigate from '@subwallet/extension-koni-ui/hooks/router/useDefaultNavigate';
import { editAccount, forgetAccount } from '@subwallet/extension-koni-ui/messaging';
import { AccountDetailParam, ThemeProps, VoidFunction } from '@subwallet/extension-koni-ui/types';
import { FormCallbacks, FormFieldData } from '@subwallet/extension-koni-ui/types/form';
import { convertFieldToObject } from '@subwallet/extension-koni-ui/utils/form/form';
import { Button, Form, Icon, Input } from '@subwallet/react-ui';
import CN from 'classnames';
import { CircleNotch, Export, FloppyDiskBack, GitMerge, Trash } from 'phosphor-react';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams } from 'react-router-dom';
import styled from 'styled-components';

import { AccountAddressList } from './AccountAddressList';
import { DerivedAccountList } from './DerivedAccountList';

enum FilterTabType {
  ACCOUNT_ADDRESS = 'account-address',
  DERIVED_ACCOUNT = 'derived-account',
}

type Props = ThemeProps;
type ComponentProps = {
  accountProxy: AccountProxy;
  onBack: VoidFunction;
  requestViewDerivedAccounts?: boolean;
};

enum FormFieldName {
  NAME = 'name'
}

// @ts-ignore
enum ActionType {
  EXPORT = 'export',
  DERIVE = 'derive',
  DELETE = 'delete'
}

interface DetailFormState {
  [FormFieldName.NAME]: string;
}

const Component: React.FC<ComponentProps> = ({ accountProxy, onBack, requestViewDerivedAccounts }: ComponentProps) => {
  const { t } = useTranslation();
  const notify = useNotification();
  const { goHome } = useDefaultNavigate();
  const showDerivedAccounts = !!accountProxy.children?.length;
  const { alertModal } = useContext(WalletModalContext);

  const [selectedFilterTab, setSelectedFilterTab] = useState<string>(
    requestViewDerivedAccounts && showDerivedAccounts
      ? FilterTabType.DERIVED_ACCOUNT
      : FilterTabType.ACCOUNT_ADDRESS
  );

  const [form] = Form.useForm<DetailFormState>();

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
  }, [showDerivedAccounts, t]);

  const onSelectFilterTab = useCallback((value: string) => {
    setSelectedFilterTab(value);
  }, []);

  const doDelete = useCallback(() => {
    setDeleting(true);
    forgetAccount(accountProxy.id)
      .then(() => {
        goHome();
      })
      .catch((e: Error) => {
        notify({
          message: e.message,
          type: 'error'
        });
      })
      .finally(() => {
        setDeleting(false);
      });
  }, [accountProxy.id, goHome, notify]);

  const onDelete = useCallback(() => {
    alertModal.open({
      title: t('Confirmation'),
      type: NotificationType.WARNING,
      content: t('You will no longer be able to access this account via this extension'),
      okButton: {
        text: t('Remove'),
        onClick: () => {
          doDelete();
          alertModal.close();
        },
        schema: 'error'
      }
    });
  }, [alertModal, doDelete, t]);

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

    if (name === accountProxy.name) {
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
    if (![AccountProxyType.UNIFIED, AccountProxyType.SOLO].includes(accountProxy.accountType)) {
      return (
        <Button
          block={true}
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
        >
          {t('Delete account')}
        </Button>
      );
    }

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
        disabled={true}
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
        disabled={true}
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

  return (
    <Layout.WithSubHeaderOnly
      disableBack={false}
      footer={footerNode}
      subHeaderIcons={[
        {
          icon: <CloseIcon />,
          onClick: onBack,
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
        <div className='account-field-wrapper'>
          <div className='account-type-tag-wrapper'>
            <AccountProxyTypeTag
              className={'account-type-tag'}
              type={accountProxy.accountType}
            />

            {
              !!accountProxy.parentId && (
                <Icon
                  className={'derived-account-flag'}
                  customSize='16px'
                  phosphorIcon={GitMerge}
                  weight={'fill'}
                />
              )
            }
          </div>
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
        </div>
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
          <DerivedAccountList
            accountProxy={accountProxy}
            className={'list-container'}
          />
        )
      }
    </Layout.WithSubHeaderOnly>
  );
};

const Wrapper = ({ className }: Props) => {
  const { goHome } = useDefaultNavigate();
  const { accountProxyId } = useParams();
  const accountProxy = useGetAccountProxyById(accountProxyId);
  const locationState = useLocation().state as AccountDetailParam | undefined;

  useEffect(() => {
    if (!accountProxy) {
      goHome();
    }
  }, [accountProxy, goHome]);

  if (!accountProxy) {
    return (
      <></>
    );
  }

  return (
    <PageWrapper
      className={CN(className)}
    >
      <Component
        accountProxy={accountProxy}
        onBack={goHome}
        requestViewDerivedAccounts={locationState?.requestViewDerivedAccounts}
      />
    </PageWrapper>
  );
};

const AccountDetail = styled(Wrapper)<Props>(({ theme: { token } }: Props) => {
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

    '.account-field-wrapper': {
      position: 'relative'
    },

    '.account-type-tag-wrapper': {
      position: 'absolute',
      zIndex: 1,
      right: token.sizeSM,
      top: token.sizeXS,
      display: 'flex'
    },

    '.account-type-tag': {
      marginRight: 0
    },

    '.account-type-tag + .derived-account-flag': {
      marginLeft: token.marginXS,
      color: token.colorTextLight3
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
