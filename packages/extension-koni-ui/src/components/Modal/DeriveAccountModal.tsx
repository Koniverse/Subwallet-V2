// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountProxyType, DerivePathInfo } from '@subwallet/extension-base/types';
import { addLazy, detectTranslate } from '@subwallet/extension-base/utils';
import { AccountProxyTypeTag } from '@subwallet/extension-koni-ui/components';
import { DERIVE_ACCOUNT_ACTION_MODAL } from '@subwallet/extension-koni-ui/constants';
import { useGetAccountProxyById, useTranslation, useUnlockChecker } from '@subwallet/extension-koni-ui/hooks';
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
import React, { Context, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Trans } from 'react-i18next';
import styled, { ThemeContext } from 'styled-components';
import useCompleteCreateAccount from '../../hooks/account/useCompleteCreateAccount';

interface Props extends ThemeProps {
  proxyId: string;
}

interface DeriveFormState {
  suri: string;
  accountName: string;
}

const modalId = DERIVE_ACCOUNT_ACTION_MODAL;

type DeriveNetworkType = DerivePathInfo['type'] | undefined;

const Component: React.FC<Props> = (props: Props) => {
  const { className, proxyId } = props;

  const { t } = useTranslation();

  const { checkActive, inactiveModal, addExclude, removeExclude } = useContext(ModalContext);
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
      'sr25519': logoMap.network.polkadot as string,
      'ed25519': logoMap.network.polkadot as string,
      'ecdsa': logoMap.network.polkadot as string,
      'ethereum': logoMap.network.ethereum as string,
      'ton': logoMap.network.ton as string,
      'ton-native': logoMap.network.ton as string,
      'bitcoin-44': logoMap.network.bitcoin as string,
      'bitcoin-84': logoMap.network.bitcoin as string,
      'bitcoin-86': logoMap.network.bitcoin as string,
      "bittest-44": logoMap.network.bitcoin as string,
      "bittest-84": logoMap.network.bitcoin as string,
      "bittest-86": logoMap.network.bitcoin as string,
    };
  }, [logoMap.network.bitcoin, logoMap.network.ethereum, logoMap.network.polkadot, logoMap.network.ton]);

  const [form] = Form.useForm<DeriveFormState>();

  const [networkType, setNetworkType] = useState<DeriveNetworkType>(undefined);
  const [loading, setLoading] = useState(false);

  const closeModal = useCallback(
    () => {
      form.resetFields();
      inactiveModal(modalId);
    },
    [form, inactiveModal]
  );

  const suriValidator = useCallback((rule: Rule, suri: string): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      setNetworkType(undefined);

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
              setNetworkType(rs.info?.type);
              resolve();
            }
          })
          .catch(reject);
      }, 500);
    });
  }, [t, proxyId]);

  const accountNameValidator = useCallback(async (validate: RuleObject, value: string) => {
    return new Promise<void>((resolve, reject) => {
      if (!value) {
        reject(t('Account name is required'));

        return;
      }

      addLazy('accountNameValidator', () => {
        validateAccountName({ name: value })
          .then((rs) => {
            if (!rs.isValid) {
              reject(t('Account name already exists'));
            } else {
              resolve();
            }
          })
          .catch(() => {
            reject(t('Account name invalid'));
          });
      }, 500);
    });
  }, [t]);

  const onSubmit: FormCallbacks<DeriveFormState>['onFinish'] = useCallback((values: DeriveFormState) => {
    const { accountName, suri } = values;

    checkUnlock()
      .then(() => {
        setLoading(true);
        deriveAccountV3({
          proxyId,
          suri,
          name: accountName
        })
          .then(() => {
            closeModal();
            onComplete();
          })
          .catch((e: Error) => {
            form.setFields([ { name: 'suri', errors: [e.message] } ])
          })
          .finally(() => {
            setLoading(false);
          });
      })
      .catch(() => {
      // Unlock is cancelled
    });
  }, [form, checkUnlock, proxyId, onComplete, closeModal]);

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
        .catch(() => {

        });
    }

    return () => {
      cancel = true;
    };
  }, [form, proxyId, isActive]);

  useEffect(() => {
    addExclude(modalId);

    return () => {
      removeExclude(modalId);
    }
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
      title={t('Create derive account')}
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
                  highlight: <span className='account-name'/>
                }}
                i18nKey={detectTranslate('This account derived by account "<highlight>{{accountName}}</highlight>"')}
                values={{ accountName: accountProxy.name }}
              />
              <div>{t('You can name and custom derive path name.')}</div>
            </div>
          </Form.Item>
          <Form.Item
            name={'suri'}
            rules={[
              {
                validator: suriValidator
              }
            ]}
            statusHelpAsTooltip={true}
          >
            <Input
              // id={passwordInputId}
              label={t('Derive path')}
              placeholder={t('Derive path')}
            />
          </Form.Item>
          <div className='account-name-info'>
            {
              networkType && (
                <div className="account-type-tag-wrapper">
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
                  validator: accountNameValidator
                }
              ]}
              statusHelpAsTooltip={true}
            >
              <Input
                // id={passwordInputId}
                label={t('Account name')}
                placeholder={t('Account name')}
                disabled={!networkType}
                suffix={(
                  <div className="__item-chain-types">
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
                          : <img
                            alt="Network type"
                            className={'__item-chain-type-item'}
                            src={keypairTypeLogoMap[networkType]}
                          />
                        : null
                    }
                  </div>
                )}
              />
            </Form.Item>
          </div>
          <Form.Item>
            <Button
              block={true}
              htmlType='submit'
              loading={loading}
              icon={<Icon phosphorIcon={CheckCircle} type='phosphor' weight='fill'/>}
            >
              {t('Create account')}
            </Button>
          </Form.Item>
        </Form>
      </div>
    </SwModal>
  );
};

const DeriveAccountModal = styled(Component)<Props>(({ theme: { token } }: Props) => {
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
  };
});

export default DeriveAccountModal;
