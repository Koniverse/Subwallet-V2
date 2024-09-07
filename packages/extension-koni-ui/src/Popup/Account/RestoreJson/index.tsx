// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NotificationType } from '@subwallet/extension-base/background/KoniTypes';
import { AccountProxyExtra } from '@subwallet/extension-base/types';
import { CloseIcon, Layout, PageWrapper } from '@subwallet/extension-koni-ui/components';
import { IMPORT_ACCOUNT_MODAL } from '@subwallet/extension-koni-ui/constants';
import { WalletModalContext } from '@subwallet/extension-koni-ui/contexts/WalletModalContextProvider';
import { useAutoNavigateToCreatePassword, useCompleteCreateAccount, useDefaultNavigate, useGoBackFromCreateAccount, useTranslation, useUnlockChecker } from '@subwallet/extension-koni-ui/hooks';
import { batchRestoreV2, jsonRestoreV2, parseBatchSingleJson, parseInfoSingleJson } from '@subwallet/extension-koni-ui/messaging';
import { ThemeProps, ValidateState } from '@subwallet/extension-koni-ui/types';
import { isKeyringPairs$Json, isValidJsonFile } from '@subwallet/extension-koni-ui/utils';
import { KeyringPair$Json } from '@subwallet/keyring/types';
import { Form, Icon, Input, SwList, Upload } from '@subwallet/react-ui';
import { UploadChangeParam, UploadFile } from '@subwallet/react-ui/es/upload/interface';
import { KeyringPairs$Json } from '@subwallet/ui-keyring/types';
import CN from 'classnames';
import { CheckCircle, FileArrowDown, XCircle } from 'phosphor-react';
import React, { ChangeEventHandler, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

import { u8aToString } from '@polkadot/util';

import AccountRestoreJsonItem from './AccountRestoreJsonItem';

type Props = ThemeProps;
type ListItemGroupLabel = {
  id: string;
  groupLabel: string;
}

type ListItem = AccountProxyExtra | ListItemGroupLabel;

const FooterIcon = (
  <Icon
    phosphorIcon={FileArrowDown}
    weight='fill'
  />
);

const formName = 'restore-json-file-form';
const passwordField = 'password';

const focusPassword = () => {
  setTimeout(() => {
    const element = document.getElementById(`${formName}_${passwordField}`);

    if (element) {
      element.focus();
    }
  }, 10);
};

const selectPassword = () => {
  setTimeout(() => {
    const element = document.getElementById(`${formName}_${passwordField}`);

    if (element) {
      (element as HTMLInputElement).select();
    }
  }, 10);
};

const enum StepState {
  UPLOAD_JSON_FILE = 'upload_json_file',
  SELECT_ACCOUNT_IMPORT = 'select_account_import'
}

const Component: React.FC<Props> = ({ className }: Props) => {
  useAutoNavigateToCreatePassword();

  const { t } = useTranslation();
  const onComplete = useCompleteCreateAccount();
  const navigate = useNavigate();
  const onBack = useGoBackFromCreateAccount(IMPORT_ACCOUNT_MODAL);
  const { goHome } = useDefaultNavigate();

  const [form] = Form.useForm();

  const checkUnlock = useUnlockChecker();

  const [fileValidateState, setFileValidateState] = useState<ValidateState>({});
  const [passwordValidateState, setPasswordValidateState] = useState<ValidateState>({});
  const [fileValidating, setFileValidating] = useState(false);
  const [passwordValidating, setPasswordValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState('');
  const [stepState, setStepState] = useState<StepState>(StepState.UPLOAD_JSON_FILE);
  const [jsonFile, setJsonFile] = useState<KeyringPair$Json | KeyringPairs$Json | undefined>(undefined);
  const { alertModal } = useContext(WalletModalContext);
  const requirePassword = useMemo<boolean>(() => (!fileValidating && !!jsonFile && !fileValidateState?.status && passwordValidateState?.status !== 'success'), [fileValidateState?.status, jsonFile, passwordValidateState?.status, fileValidating]);

  const [accountProxies, setAccountProxies] = useState<AccountProxyExtra[]>([]);
  const [accountProxiesSelected, setAccountProxiesSelected] = useState<string[]>([]);

  const disableSubmit = useMemo<boolean>(() => {
    if (stepState === StepState.SELECT_ACCOUNT_IMPORT && accountProxiesSelected.length === 0) {
      return true;
    }

    return !!fileValidateState.status || (!requirePassword && passwordValidateState.status !== 'success') || !password;
  }, [fileValidateState.status, password, passwordValidateState.status, requirePassword, stepState, accountProxiesSelected]);

  const onBack_ = useCallback(() => {
    if (stepState === StepState.SELECT_ACCOUNT_IMPORT) {
      setJsonFile(undefined);
      setPassword('');
      setAccountProxies([]);
      setAccountProxiesSelected([]);
      setStepState(StepState.UPLOAD_JSON_FILE);
    } else {
      onBack();
    }
  }, [onBack, stepState]);

  const listItem = useMemo<ListItem[]>(() => {
    const result: ListItem[] = [];
    const exitedAccount: ListItem[] = [];

    accountProxies.forEach((ap) => {
      if (ap.isExistAccount) {
        exitedAccount.push(ap);
      } else {
        result.push(ap);
      }
    });

    if (exitedAccount.length) {
      exitedAccount.unshift({
        id: 'existed_accounts',
        groupLabel: t('Account already exists')
      });

      result.push(...exitedAccount);
    }

    return result;
  }, [accountProxies, t]);

  const onChangeFile = useCallback((info: UploadChangeParam<UploadFile<unknown>>) => {
    if (fileValidating) {
      return;
    }

    setFileValidating(true);
    setFileValidateState({});
    const uploadFile = info.file;

    uploadFile.originFileObj?.arrayBuffer()
      .then((bytes) => {
        const json = JSON.parse(u8aToString(Uint8Array.from(Buffer.from(bytes)))) as KeyringPair$Json | KeyringPairs$Json;

        if (!isValidJsonFile(json)) {
          throw new Error(t('Invalid JSON file'));
        }

        if (JSON.stringify(jsonFile) !== JSON.stringify(json)) {
          setAccountProxies([]);
          setPassword('');
          setJsonFile(json);
          setPasswordValidateState({});
        }
      })
      .catch((e: Error) => {
        setFileValidateState({
          status: 'error',
          message: e.message
        });
      })
      .finally(() => {
        setFileValidating(false);
      });
  }, [fileValidating, jsonFile, t]);

  const onValidatePassword = useCallback(() => {
    if (!jsonFile || passwordValidating) {
      return;
    }

    setPasswordValidating(true);

    const onFail = (e: Error) => {
      setPasswordValidateState({
        status: 'error',
        message: e.message
      });
      selectPassword();
    };

    if (isKeyringPairs$Json(jsonFile)) {
      parseBatchSingleJson({
        json: jsonFile,
        password
      })
        .then(({ accountProxies }) => {
          setAccountProxies(accountProxies);
          setPasswordValidateState({ status: 'success' });
        })
        .catch(onFail)
        .finally(() => {
          setPasswordValidating(false);
        });
    } else {
      parseInfoSingleJson({
        json: jsonFile,
        password
      })
        .then(({ accountProxy }) => {
          setAccountProxies([accountProxy]);
          setPasswordValidateState({ status: 'success' });
        })
        .catch(onFail)
        .finally(() => {
          setPasswordValidating(false);
        });
    }
  }, [jsonFile, passwordValidating, password]);

  const onImportFinal = useCallback(() => {
    if (!jsonFile) {
      return;
    }

    checkUnlock()
      .then(() => {
        setSubmitting(true);

        setTimeout(() => {
          const isMultiple = isKeyringPairs$Json(jsonFile);

          (isMultiple
            ? batchRestoreV2({
              file: jsonFile,
              password,
              isAllowed: true,
              proxyIds: accountProxiesSelected
            })
            : jsonRestoreV2({
              file: jsonFile,
              password: password,
              address: accountProxiesSelected[0],
              isAllowed: true,
              withMasterPassword: true
            }))
            .then(() => {
              setTimeout(() => {
                if (isMultiple) {
                  navigate('/keyring/migrate-password');
                } else {
                  onComplete();
                }
              }, 1000);
            })
            .catch((e: Error) => {
              setPasswordValidateState({
                message: e.message,
                status: 'error'
              });
              selectPassword();
            })
            .finally(() => {
              setSubmitting(false);
            });
        }, 500);
      }).catch(() => {
      // User cancel unlock
      });
  }, [accountProxiesSelected, checkUnlock, jsonFile, navigate, onComplete, password]);

  const openExitedAccountNameWarningModal = useCallback(() => {
    alertModal.open({
      closable: false,
      content: t('This account name already exists. Some characters will be added at the beginning of the name to distinguish it from existing account names.'),
      title: t('Account name already exists'),
      okButton: {
        text: t('I understand'),
        icon: CheckCircle,
        iconWeight: 'fill',
        onClick: () => {
          alertModal.close();
          onImportFinal();
        },
        schema: 'primary'
      },

      cancelButton: {
        text: t('Cancel'),
        icon: XCircle,
        iconWeight: 'fill',
        onClick: () => {
          alertModal.close();
        },
        schema: 'secondary'
      },

      type: NotificationType.WARNING
    });
  }, [alertModal, onImportFinal, t]);

  const onImport = useCallback(() => {
    if (!jsonFile) {
      return;
    }

    const isHasAccountInvalidName = accountProxiesSelected.some((ap) => {
      const accountProxy = accountProxies.find((a) => a.id === ap);

      return accountProxy?.isExistName;
    });

    if (isHasAccountInvalidName) {
      openExitedAccountNameWarningModal();
    } else {
      onImportFinal();
    }
  }, [accountProxies, accountProxiesSelected, jsonFile, onImportFinal, openExitedAccountNameWarningModal]);

  const onSubmit = useCallback(() => {
    if (!jsonFile) {
      return;
    }

    if (!requirePassword) {
      onImport();
    } else {
      onValidatePassword();
    }
  }, [jsonFile, onImport, onValidatePassword, requirePassword]);

  const onSelect = useCallback((account: AccountProxyExtra) => {
    return () => {
      setAccountProxiesSelected((prev) => {
        if (prev.includes(account.id)) {
          return prev.filter((id) => id !== account.id);
        }

        return [...prev, account.id];
      });
    };
  }, []);

  const renderItem = useCallback((item: ListItem): React.ReactNode => {
    const selected = accountProxiesSelected.includes(item.id);

    if ((item as ListItemGroupLabel).groupLabel) {
      return (
        <div
          className={'list-item-group-label'}
          key={item.id}
        >
          {(item as ListItemGroupLabel).groupLabel}
        </div>
      );
    }

    return (
      <AccountRestoreJsonItem
        accountProxy={item as AccountProxyExtra}
        className='account-selection'
        disabled={submitting}
        isSelected={selected}
        key={item.id}
        onClick={onSelect(item as AccountProxyExtra)}
        showUnSelectedIcon ={true}
      />
    );
  }, [accountProxiesSelected, onSelect, submitting]);

  const onChangePassword: ChangeEventHandler<HTMLInputElement> = useCallback((event) => {
    const value = event.target.value;

    if (!value) {
      setPasswordValidateState({
        message: t('Password is required'),
        status: 'error'
      });
    } else {
      setPasswordValidateState({});
    }

    setPassword(value);
  }, [t]);

  const footerContent = useMemo(() => {
    if (stepState === StepState.UPLOAD_JSON_FILE) {
      return t('Unlock file');
    } else {
      if (accountProxiesSelected.length === 0) {
        return t('Import account');
      } else if (accountProxiesSelected.length === 1) {
        return t('Import 1 account');
      } else {
        return t(`Import ${accountProxiesSelected.length} accounts`);
      }
    }
  }, [accountProxiesSelected.length, stepState, t]);

  const titlePage = useMemo(() => {
    if (stepState === StepState.UPLOAD_JSON_FILE) {
      return t('Import from JSON file');
    } else {
      if (accountProxies.length <= 1) {
        return t('Import account');
      } else {
        return t('Import multi account');
      }
    }
  }, [accountProxies.length, stepState, t]);

  useEffect(() => {
    if (requirePassword) {
      focusPassword();
    }
  }, [requirePassword]);

  useEffect(() => {
    if (accountProxies.length > 0) {
      setStepState(StepState.SELECT_ACCOUNT_IMPORT);
    } else {
      setStepState(StepState.UPLOAD_JSON_FILE);
    }
  }, [accountProxies.length]);

  return (
    <PageWrapper className={CN(className)}>
      <Layout.WithSubHeaderOnly
        onBack={onBack_}
        rightFooterButton={{
          children: footerContent,
          icon: FooterIcon,
          onClick: onSubmit,
          disabled: disableSubmit,
          loading: fileValidating || passwordValidating || submitting
        }}
        subHeaderIcons={[
          {
            icon: <CloseIcon />,
            onClick: goHome
          }
        ]}
        title={titlePage}
      >
        <div className={CN('container')}>
          { stepState === StepState.UPLOAD_JSON_FILE &&
            <>
              <div className='description'>
                {t('Drag and drop the JSON file you exported from Polkadot.{js}')}
              </div>
              <Form
                className='form-container'
                form={form}
                name={formName}
              >
                <Form.Item
                  validateStatus={fileValidateState.status}
                >
                  <Upload.SingleFileDragger
                    accept={'application/json'}
                    className='file-selector'
                    disabled={fileValidating}
                    hint={t('Drag and drop the JSON file you exported from Polkadot.{js}')}
                    onChange={onChangeFile}
                    statusHelp={fileValidateState.message}
                    title={t('Import by JSON file')}
                  />
                </Form.Item>
                {
                  requirePassword && (
                    <Form.Item
                      validateStatus={passwordValidateState.status}
                    >
                      <div className='input-label'>
                        {t('Please enter the password you have used when creating your Polkadot.{js} account')}
                      </div>
                      <Input.Password
                        id={`${formName}_${passwordField}`}
                        onChange={onChangePassword}
                        placeholder={t('Password')}
                        statusHelp={passwordValidateState.message}
                        type='password'
                        value={password}
                      />
                    </Form.Item>
                  )
                }
              </Form>
            </>

          }

          {
            stepState === StepState.SELECT_ACCOUNT_IMPORT && passwordValidateState.status === 'success' && (
              <>
                <div className='sub-title'>
                  {t('Please select the account (s) you’d like to import')}
                </div>
                <SwList.Section
                  className='list-container'
                  displayRow={true}
                  hasMoreItems={true}
                  list={listItem}
                  renderItem={renderItem}
                  rowGap='var(--list-gap)'
                />
              </>

            )
          }
        </div>
      </Layout.WithSubHeaderOnly>
    </PageWrapper>
  );
};

const ImportJson = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {
    '--row-gap': `${token.sizeXS}px`,

    '.container': {
      padding: token.padding,
      paddingBottom: 0,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    },

    '.description': {
      padding: `0 ${token.padding}px`,
      fontSize: token.fontSizeHeading6,
      lineHeight: token.lineHeightHeading6,
      color: token.colorTextDescription,
      textAlign: 'center'
    },

    '.sub-title': {
      padding: `0 ${token.padding}px`,
      fontSize: token.fontSizeHeading6,
      lineHeight: token.lineHeightHeading6,
      color: token.colorTextDescription,
      marginBottom: token.margin,
      textAlign: 'center'
    },

    '.form-container': {
      marginTop: token.margin
    },

    '.ant-form-item:last-child': {
      marginBottom: 0
    },

    '.input-label': {
      fontSize: token.fontSizeHeading6,
      lineHeight: token.lineHeightHeading6,
      color: token.colorTextDescription,
      marginBottom: token.margin
    },

    '.account-list-item': {
      marginTop: -token.marginXS,

      '.account-item': {
        cursor: 'default'
      },

      '.ant-web3-block-right-item': {
        marginRight: 0
      }
    },

    '.ant-web3-block': {
      display: 'flex !important'
    },

    '.ant-sw-modal-body': {
      padding: `${token.padding}px 0 ${token.padding}px`,
      flexDirection: 'column',
      display: 'flex'
    },

    '.ant-sw-list-wrapper': {
      overflow: 'hidden',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      margin: `0 -${token.margin}px`
    },

    '.list-item-group-label': {
      textTransform: 'uppercase',
      fontSize: 11,
      lineHeight: '18px',
      marginTop: token.margin,
      fontWeight: token.headingFontWeight,
      color: token.colorTextLight3
    },

    '.file-selector': {
      '.ant-upload-drag-single': {
        height: 168
      }
    }
  };
});

export default ImportJson;
