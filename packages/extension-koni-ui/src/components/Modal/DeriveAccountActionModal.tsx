// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NotificationType } from '@subwallet/extension-base/background/KoniTypes';
import { AccountProxyType, DerivePathInfo } from '@subwallet/extension-base/types';
import { addLazy, detectTranslate } from '@subwallet/extension-base/utils';
import { DERIVE_ACCOUNT_ACTION_MODAL } from '@subwallet/extension-koni-ui/constants';
import { WalletModalContext } from '@subwallet/extension-koni-ui/contexts/WalletModalContextProvider';
import { useCompleteCreateAccount, useGetAccountProxyById, useTranslation, useUnlockChecker } from '@subwallet/extension-koni-ui/hooks';
import { deriveAccountV3, deriveSuggest, validateAccountName, validateDerivePathV2 } from '@subwallet/extension-koni-ui/messaging';
import { Theme } from '@subwallet/extension-koni-ui/themes';
import { FormCallbacks, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { noop } from '@subwallet/extension-koni-ui/utils';
import { KeypairType } from '@subwallet/keyring/types';
import { Button, Form, Icon, Input, ModalContext, SwModal } from '@subwallet/react-ui';
import { Rule } from '@subwallet/react-ui/es/form';
import CN from 'classnames';
import { CaretLeft, CheckCircle } from 'phosphor-react';
import { RuleObject } from 'rc-field-form/lib/interface';
import React, { Context, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Trans } from 'react-i18next';
import styled, { ThemeContext } from 'styled-components';

import { AccountProxyTypeTag } from '../AccountProxy';

export interface AccountDeriveActionProps {
  proxyId: string;
  onCompleteCb?: () => void;
}

type Props = ThemeProps & AccountDeriveActionProps;

interface DeriveFormState {
  suri: string;
  accountName: string;
}

const modalId = DERIVE_ACCOUNT_ACTION_MODAL;

const alertTypes: DerivePathInfo['type'][] = ['unified', 'ton', 'ethereum',  'cardano'];

const Component: React.FC<Props> = (props: Props) => {
  const { className, onCompleteCb, proxyId } = props;

  const { t } = useTranslation();

  const { addExclude, checkActive, inactiveModal, removeExclude } = useContext(ModalContext);
  const { alertModal: { close: closeAlert, open: openAlert } } = useContext(WalletModalContext);
  const { logoMap } = useContext<Theme>(ThemeContext as Context<Theme>);

  const isActive = checkActive(modalId);

  const accountProxy = useGetAccountProxyById(proxyId);
  const checkUnlock = useUnlockChecker();
  const onComplete = useCompleteCreateAccount();

  const modalCloseButton = useMemo(() => (
    <Icon
      customSize={'24px'}
      phosphorIcon={CaretLeft}
      type='phosphor'
      weight={'light'}
    />
  ), []);

  const keypairTypeLogoMap = useMemo((): Record<KeypairType, string> => {
    return {
      sr25519: logoMap.network.polkadot as string,
      ed25519: logoMap.network.polkadot as string,
      ecdsa: logoMap.network.polkadot as string,
      ethereum: logoMap.network.ethereum as string,
      ton: logoMap.network.ton as string,
      'ton-native': logoMap.network.ton as string,
      'bitcoin-44': logoMap.network.bitcoin as string,
      'bitcoin-84': logoMap.network.bitcoin as string,
      'bitcoin-86': logoMap.network.bitcoin as string,
      'bittest-44': logoMap.network.bitcoin as string,
      'bittest-84': logoMap.network.bitcoin as string,
      'bittest-86': logoMap.network.bitcoin as string,
      cardano: logoMap.network.cardano as string
    };
  }, [logoMap.network.bitcoin, logoMap.network.cardano, logoMap.network.ethereum, logoMap.network.polkadot, logoMap.network.ton]);

  const [form] = Form.useForm<DeriveFormState>();

  const [loading, setLoading] = useState(false);
  const [, setUpdate] = useState({});
  const infoRef = useRef<DerivePathInfo | undefined>();
  const networkType = infoRef.current?.type;

  const closeModal = useCallback(
    () => {
      form.resetFields();
      inactiveModal(modalId);
    },
    [form, inactiveModal]
  );

  const onSuriChange = useCallback(() => {
    form.setFields([{ name: 'suri', errors: [] }]);
  }, [form]);

  const setInfo = useCallback((data: DerivePathInfo | undefined) => {
    infoRef.current = data;
    setUpdate({});
  }, []);

  const suriValidator = useCallback((rule: Rule, suri: string): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      setInfo(undefined);

      if (!suri) {
        reject(t('Derive path is required'));
      }

      addLazy('validateDerivationPath', () => {
        validateDerivePathV2({
          suri,
          proxyId
        })
          .then((rs) => {
            if (rs.error) {
              reject(rs.error);
            } else {
              setInfo(rs.info);
              resolve();
            }
          })
          .catch(reject);
      }, 300, 1000);
    });
  }, [setInfo, t, proxyId]);

  const onAccountNameChange = useCallback(() => {
    form.setFields([{ name: 'accountName', errors: [] }]);
  }, [form]);

  const accountNameValidator = useCallback(async (validate: RuleObject, value: string) => {
    return new Promise<void>((resolve, reject) => {
      if (!value) {
        reject(t('Account name is required'));

        return;
      }

      validateAccountName({ name: value })
        .then((rs) => {
          if (!rs.isValid) {
            reject(t('Account name already in use'));
          } else {
            resolve();
          }
        })
        .catch(() => {
          reject(t('Account name invalid'));
        });
    });
  }, [t]);

  const onSubmit: FormCallbacks<DeriveFormState>['onFinish'] = useCallback((values: DeriveFormState) => {
    const { accountName, suri } = values;

    const _suri = suri.trim();
    const _name = accountName.trim();
    const _info = infoRef.current;

    if (!_info) {
      return;
    }

    const _doSubmit = () => {
      checkUnlock()
        .then(() => {
          setLoading(true);
          deriveAccountV3({
            proxyId,
            suri: _suri,
            name: _name
          })
            .then(() => {
              closeModal();
              onComplete();
              onCompleteCb?.();
            })
            .catch((e: Error) => {
              form.setFields([{ name: 'suri', errors: [e.message] }]);
            })
            .finally(() => {
              setLoading(false);
            });
        })
        .catch(() => {
          // Unlock is cancelled
        });
    };

    if (_info.depth === 2 && alertTypes.includes(_info.type)) {
      openAlert({
        type: NotificationType.WARNING,
        content: t('This derived account can only be used in SubWallet and won’t be compatible with other wallets. Do you still want to continue?'),
        title: t('Incompatible account'),
        okButton: {
          text: t('Continue'),
          onClick: () => {
            closeAlert();
            _doSubmit();
          }
        },
        cancelButton: {
          text: t('Cancel'),
          onClick: closeAlert
        }
      });
    } else {
      _doSubmit();
    }
  }, [checkUnlock, proxyId, closeModal, onComplete, onCompleteCb, form, openAlert, t, closeAlert]);

  useEffect(() => {
    if (!accountProxy && isActive) {
      closeModal();
    }
  }, [accountProxy, closeModal, isActive]);

  useEffect(() => {
    let cancel = false;

    if (proxyId && isActive) {
      deriveSuggest({
        proxyId
      })
        .then((rs) => {
          if (!cancel) {
            if (rs.info) {
              const suri = rs.info.derivationPath || rs.info.suri;

              form.setFieldValue('suri', suri);
              form.validateFields(['suri']).catch(noop);
            }
          }
        })
        .catch(console.error);
    }

    return () => {
      cancel = true;
    };
  }, [form, proxyId, isActive]);

  useEffect(() => {
    addExclude(modalId);

    return () => {
      removeExclude(modalId);
    };
  }, [addExclude, removeExclude]);

  if (!accountProxy) {
    return null;
  }

  return (
    <SwModal
      className={CN(className)}
      closeIcon={modalCloseButton}
      id={modalId}
      onCancel={closeModal}
      title={t('Create derived account')}
    >
      <div className='body-container'>
        <Form
          form={form}
          initialValues={{
            suri: '',
            accountName: ''
          }}
          onFinish={onSubmit}
        >
          <Form.Item>
            <div className='derive-header-title'>
              <Trans
                components={{
                  highlight: <span className='account-name' />
                }}
                i18nKey={detectTranslate('You are creating a derived account from account <highlight>{{accountName}}</highlight>. Customize the derivation path and name the account as you wish')}
                values={{ accountName: accountProxy.name }}
              />
            </div>
          </Form.Item>
          <Form.Item
            name={'suri'}
            rules={[
              {
                transform: (value: string) => value.trim(),
                validator: suriValidator
              }
            ]}
            statusHelpAsTooltip={true}
          >
            <Input
              // id={passwordInputId}
              label={t('Derivation path')}
              onChange={onSuriChange}
              placeholder={t('Derivation path')}
            />
          </Form.Item>
          <div className='account-name-info'>
            {
              networkType && (
                <div className='account-type-tag-wrapper'>
                  <AccountProxyTypeTag
                    className={'account-type-tag'}
                    type={networkType === 'unified' ? AccountProxyType.UNIFIED : AccountProxyType.SOLO}
                  />
                </div>
              )
            }
            <Form.Item
              name={'accountName'}
              rules={[
                {
                  transform: (value: string) => value.trim(),
                  validator: accountNameValidator
                }
              ]}
              statusHelpAsTooltip={true}
              validateTrigger={false}
            >
              <Input
                // id={passwordInputId}
                label={t('Account name')}
                onChange={onAccountNameChange}
                placeholder={t('Account name')}
                suffix={(
                  <div className='__item-chain-types'>
                    {
                      networkType
                        ? networkType === 'unified'
                          ? (
                            accountProxy.accounts.map(({ type }) => {
                              return (
                                <img
                                  alt='Network type'
                                  className={'__item-chain-type-item'}
                                  key={type}
                                  src={keypairTypeLogoMap[type]}
                                />
                              );
                            })
                          )
                          : (
                            <img
                              alt='Network type'
                              className={'__item-chain-type-item'}
                              src={keypairTypeLogoMap[networkType]}
                            />
                          )
                        : null
                    }
                  </div>
                )}
              />
            </Form.Item>
          </div>
          <Form.Item
            className='submit-button'
          >
            <Button
              block={true}
              htmlType='submit'
              icon={(
                <Icon
                  phosphorIcon={CheckCircle}
                  type='phosphor'
                  weight='fill'
                />
              )}
              loading={loading}
            >
              {t('Create account')}
            </Button>
          </Form.Item>
        </Form>
      </div>
    </SwModal>
  );
};

const DeriveAccountActionModal = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {
    '.derive-header-title': {
      textAlign: 'center',
      color: token.colorTextDescription,

      '.account-name': {
        color: token.colorText
      }
    },

    '.account-name-info': {
      position: 'relative',

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

      '.__item-chain-types': {
        display: 'flex',
        paddingTop: 2,

        '.__item-chain-type-item': {
          display: 'block',
          boxShadow: '-4px 0px 4px 0px rgba(0, 0, 0, 0.40)',
          width: token.size,
          height: token.size,
          borderRadius: '100%',
          marginLeft: -token.marginXXS
        },

        '.__item-chain-type-item:first-of-type': {
          marginLeft: 0
        }
      },

      '.ant-input-suffix': {
        marginRight: 0
      }
    },

    '.submit-button': {
      marginBottom: 0
    }
  };
});

export default DeriveAccountActionModal;
