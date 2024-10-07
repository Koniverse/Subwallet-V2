// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountAuthType, AuthorizeRequest } from '@subwallet/extension-base/background/types';
import { ALL_ACCOUNT_AUTH_TYPES, ALL_ACCOUNT_KEY } from '@subwallet/extension-base/constants';
import { AccountChainType } from '@subwallet/extension-base/types';
import { AccountProxyItem, AccountProxySelectorAllItem, ConfirmationGeneralInfo } from '@subwallet/extension-koni-ui/components';
import { DEFAULT_ACCOUNT_TYPES, EVM_ACCOUNT_TYPE, SUBSTRATE_ACCOUNT_TYPE, TON_ACCOUNT_TYPE } from '@subwallet/extension-koni-ui/constants';
import { useSetSelectedAccountTypes } from '@subwallet/extension-koni-ui/hooks';
import { approveAuthRequestV2, cancelAuthRequestV2, rejectAuthRequestV2 } from '@subwallet/extension-koni-ui/messaging';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import { filterAuthorizeAccountProxies, isAccountAll } from '@subwallet/extension-koni-ui/utils';
import { KeypairType } from '@subwallet/keyring/types';
import { Button, Icon } from '@subwallet/react-ui';
import CN from 'classnames';
import { PlusCircle, ShieldSlash, XCircle } from 'phosphor-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

interface Props extends ThemeProps {
  request: AuthorizeRequest
}

async function handleConfirm ({ id }: AuthorizeRequest, selectedAccounts: string[]) {
  return await approveAuthRequestV2(id, selectedAccounts.filter((item) => !isAccountAll(item)));
}

async function handleCancel ({ id }: AuthorizeRequest) {
  return await cancelAuthRequestV2(id);
}

async function handleBlock ({ id }: AuthorizeRequest) {
  return await rejectAuthRequestV2(id);
}

function Component ({ className, request }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const { accountAuthTypes, allowedAccounts } = request.request;
  const { accountProxies, accounts } = useSelector((state: RootState) => state.accountState);
  const navigate = useNavigate();

  // todo: deprecated, recheck usage
  const setSelectedAccountTypes = useSetSelectedAccountTypes(true);

  // List all of all accounts by auth type
  const visibleAccountProxies = useMemo(() => (filterAuthorizeAccountProxies(accountProxies, accountAuthTypes || ALL_ACCOUNT_AUTH_TYPES)),
    [accountAuthTypes, accountProxies]);

  // Selected map with default values is map of all accounts
  const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>({});

  const isDisableConnect = useMemo(() => {
    return !visibleAccountProxies.filter(({ id }) => !!selectedMap[id]).length;
  }, [selectedMap, visibleAccountProxies]);

  const noAvailableTitle = useMemo(() => {
    if (accountAuthTypes && accountAuthTypes.length === 1) {
      switch (accountAuthTypes[0]) {
        case 'substrate':
          return t('No available Substrate account');
        case 'evm':
          return t('No available EVM account');
        case 'ton':
          return t('No available TON account');
      }
    }

    return t('No available account');
  }, [accountAuthTypes, t]);

  const noAvailableDescription = useMemo(() => {
    if (accountAuthTypes && accountAuthTypes.length === 1) {
      switch (accountAuthTypes[0]) {
        case 'substrate':
          return t("You don't have any Substrate account to connect. Please create one or skip this step by hitting Cancel.");
        case 'evm':
          return t("You don't have any EVM account to connect. Please create one or skip this step by hitting Cancel.");
      }
    }

    return t("You don't have any account to connect. Please create one or skip this step by hitting Cancel.");
  }, [accountAuthTypes, t]);

  // Handle buttons actions
  const onBlock = useCallback(() => {
    setLoading(true);
    handleBlock(request).finally(() => {
      setLoading(false);
    });
  }, [request]);

  const onCancel = useCallback(() => {
    setLoading(true);
    handleCancel(request).finally(() => {
      setLoading(false);
    });
  }, [request]);

  const onConfirm = useCallback(() => {
    setLoading(true);
    const selectedAccountProxyIds = Object.keys(selectedMap).filter((key) => selectedMap[key]);
    const selectedAccounts = accounts.filter(({ chainType, proxyId }) => {
      if (selectedAccountProxyIds.includes(proxyId || '')) {
        switch (chainType) {
          case AccountChainType.SUBSTRATE: return accountAuthTypes?.includes('substrate');
          case AccountChainType.ETHEREUM: return accountAuthTypes?.includes('evm');
          case AccountChainType.TON: return accountAuthTypes?.includes('ton');
        }
      }

      return false;
    }).map(({ address }) => address);

    handleConfirm(request, selectedAccounts).finally(() => {
      setLoading(false);
    });
  }, [accountAuthTypes, accounts, request, selectedMap]);

  const onAddAccount = useCallback(() => {
    let types: KeypairType[];

    const addAccountType: Record<AccountAuthType, KeypairType> = {
      evm: EVM_ACCOUNT_TYPE,
      substrate: SUBSTRATE_ACCOUNT_TYPE,
      ton: TON_ACCOUNT_TYPE
    };

    if (accountAuthTypes) {
      types = accountAuthTypes.map((type) => addAccountType[type]);
    } else {
      types = DEFAULT_ACCOUNT_TYPES;
    }

    setSelectedAccountTypes(types);
    navigate('/accounts/new-seed-phrase', { state: { useGoBack: true } });
  }, [accountAuthTypes, navigate, setSelectedAccountTypes]);

  const onAccountSelect = useCallback((proxyId: string) => {
    const isAll = isAccountAll(proxyId);

    return () => {
      const visibleProxyId = visibleAccountProxies.map((item) => item.id);

      setSelectedMap((map) => {
        const isChecked = !map[proxyId];
        const newMap = { ...map };

        if (isAll) {
          // Select/deselect all accounts
          visibleProxyId.forEach((key) => {
            newMap[key] = isChecked;
          });
          newMap[ALL_ACCOUNT_KEY] = isChecked;
        } else {
          // Select/deselect single account and trigger all account
          newMap[proxyId] = isChecked;
          newMap[ALL_ACCOUNT_KEY] = visibleProxyId
            .filter((i) => !isAccountAll(i))
            .every((item) => newMap[item]);
        }

        return newMap;
      });
    };
  }, [visibleAccountProxies]);

  // Create selected map by default
  useEffect(() => {
    setSelectedMap((map) => {
      const existedKey = Object.keys(map);

      accountProxies.forEach((item) => {
        if (!existedKey.includes(item.id)) {
          map[item.id] = item.accounts.some((account) => {
            if (allowedAccounts?.includes(account.address)) {
              switch (account.chainType) {
                case AccountChainType.SUBSTRATE:
                  return accountAuthTypes?.includes('substrate');
                case AccountChainType.ETHEREUM:
                  return accountAuthTypes?.includes('evm');
                case AccountChainType.TON:
                  return accountAuthTypes?.includes('ton');
              }
            }

            return false;
          });
        }
      });

      map[ALL_ACCOUNT_KEY] = visibleAccountProxies.every((item) => map[item.id]);

      return { ...map };
    });
  }, [accountAuthTypes, accountProxies, allowedAccounts, visibleAccountProxies]);

  return (
    <>
      <div className={CN('confirmation-content', className)}>
        <ConfirmationGeneralInfo request={request} />
        <div
          className={CN(
            'title',
            {
              'sub-title': visibleAccountProxies.length > 0
            }
          )}
        >
          {
            visibleAccountProxies.length === 0
              ? noAvailableTitle
              : t('Choose the account(s) you’d like to connect')
          }
        </div>
        {
          !!visibleAccountProxies.length && (
            <div className='account-list'>
              {
                visibleAccountProxies.length > 1 &&
                  (
                    <AccountProxySelectorAllItem
                      accountProxies={visibleAccountProxies}
                      className={'all-account-selection'}
                      isSelected={selectedMap[ALL_ACCOUNT_KEY]}
                      onClick={onAccountSelect(ALL_ACCOUNT_KEY)}
                      showUnSelectedIcon
                    />
                  )
              }
              {visibleAccountProxies.map((item) => (
                <AccountProxyItem
                  accountProxy={item}
                  className={'__account-proxy-item'}
                  isSelected={selectedMap[item.id]}
                  key={item.id}
                  onClick={onAccountSelect(item.id)}
                  showUnselectIcon
                />
              ))}
            </div>
          )
        }
        <div className='description'>
          {
            visibleAccountProxies.length === 0
              ? noAvailableDescription
              : t('Make sure you trust this site before connecting')
          }
        </div>
      </div>
      <div className='confirmation-footer'>
        {
          visibleAccountProxies.length > 0 &&
          (
            <>
              <Button
                className={'icon-btn'}
                danger={true}
                disabled={loading}
                icon={<Icon phosphorIcon={ShieldSlash} />}
                onClick={onBlock}
              />
              <Button
                disabled={loading}
                onClick={onCancel}
                schema={'secondary'}
              >
                {t('Cancel')}
              </Button>
              <Button
                disabled={isDisableConnect}
                loading={loading}
                onClick={onConfirm}
              >
                {t('Connect')}
              </Button>
            </>
          )
        }
        {
          visibleAccountProxies.length === 0 &&
            (
              <>
                <Button
                  disabled={loading}
                  icon={(
                    <Icon
                      phosphorIcon={XCircle}
                      weight='fill'
                    />
                  )}
                  onClick={onCancel}
                  schema={'secondary'}
                >
                  {t('Cancel')}
                </Button>
                <Button
                  disabled={loading}
                  icon={(
                    <Icon
                      phosphorIcon={PlusCircle}
                      weight='fill'
                    />
                  )}
                  onClick={onAddAccount}
                >
                  {t('Create one')}
                </Button>
              </>
            )
        }
      </div>
    </>
  );
}

const AuthorizeConfirmation = styled(Component)<Props>(({ theme: { token } }: ThemeProps) => ({
  '--content-gap': `${token.size}px`,

  '.title.sub-title': {
    fontSize: token.fontSizeHeading6,
    lineHeight: token.lineHeightHeading6,
    textAlign: 'start'
  },

  '.account-list': {
    display: 'flex',
    flexDirection: 'column',
    gap: token.sizeXS
  },

  '.all-account-selection': {
    '.__item-middle-part': {
      textAlign: 'start',
      fontSize: token.fontSize
    }
  },

  '.__account-proxy-item': {
    '.__item-middle-part': {
      textWrap: 'nowrap',
      textOverflow: 'ellipsis',
      overflow: 'hidden'
    }

  }
}));

export default AuthorizeConfirmation;
