// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountProxyAvatar } from '@subwallet/extension-koni-ui/components';
import { AvatarGroup } from '@subwallet/extension-koni-ui/components/Account';
import { BaseAccountInfo } from '@subwallet/extension-koni-ui/components/Account/Info/AvatarGroup';
import { useGetAccountByAddress } from '@subwallet/extension-koni-ui/hooks';
import { isAccountAll, toShort } from '@subwallet/extension-koni-ui/utils';
import CN from 'classnames';
import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import { InfoItemBase } from './types';

export interface AccountInfoItem extends InfoItemBase {
  address: string;
  name?: string;
  networkPrefix?: number;
  accounts?: BaseAccountInfo[];
  chainSlug?: string;
}

const Component: React.FC<AccountInfoItem> = (props: AccountInfoItem) => {
  const { accounts, address: accountAddress, className, label, name: accountName, valueColorSchema = 'default' } = props;

  const { t } = useTranslation();
  const account = useGetAccountByAddress(accountAddress);

  const shortAddress = toShort(accountAddress);

  const name = accountName || account?.name;
  const isAll = isAccountAll(accountAddress);

  return (
    <div className={CN(className, '__row -type-account')}>
      {!!label && <div className={'__col __label-col'}>
        <div className={'__label'}>
          {label}
        </div>
      </div>}
      <div className={'__col __value-col -to-right'}>
        <div className={`__account-item __value -is-wrapper -schema-${valueColorSchema}`}>
          {
            isAll
              ? (
                <>
                  <AvatarGroup
                    accounts={accounts}
                    className={'__account-avatar'}
                  />
                  <div className={'__account-name ml-xs'}>
                    {accounts ? t('{{number}} accounts', { replace: { number: accounts.length } }) : t('All accounts')}
                  </div>
                </>
              )
              : (
                <>
                  {name
                    ? (
                      <>
                        <div className={'__account-item-wrapper ml-xs'}>
                          <div className={'__account-item-name-wrapper'}>
                            <AccountProxyAvatar
                              className={'__account-avatar'}
                              size={24}
                              value={account?.proxyId || accountAddress}
                            />
                            <div className={'__account-item-name'}>{name}</div>
                          </div>
                          <div className={'__account-item-address'}>{shortAddress}</div>
                        </div>
                      </>
                    )
                    : (<>
                      <AccountProxyAvatar
                        className={'__account-avatar'}
                        size={24}
                        value={account?.proxyId || accountAddress}
                      />
                      <div className={'__account-name ml-xs'}>
                        <div className={'__account-item-address'}>{shortAddress}</div>
                      </div>
                    </>)
                  }
                </>)
          }
        </div>
      </div>
    </div>
  );
};

const AccountItem = styled(Component)<AccountInfoItem>(({ theme: { token } }: AccountInfoItem) => {
  return {
    '.__account-item-wrapper': {
      overflow: 'hidden',
      '.__account-item-name-wrapper': {
        display: 'flex',
        overflow: 'hidden',
        gap: 8
      },
      '.__account-item-name': {
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        overflow: 'hidden'
      },
      '.__account-item-address': {
        paddingLeft: 32,
        fontSize: token.fontSizeSM,
        lineHeight: token.lineHeightSM,
        marginRight: 0
      }
    },
    '.__col.__value-col.__value-col': {
      flex: '1.2'
    },
    '.__col.__label-col.__label-col': {
      justifyContent: 'flex-start'
    }
  };
});

export default AccountItem;
