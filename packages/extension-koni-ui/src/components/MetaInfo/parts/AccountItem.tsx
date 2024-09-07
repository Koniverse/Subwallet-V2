// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AvatarGroup } from '@subwallet/extension-koni-ui/components/Account';
import { BaseAccountInfo } from '@subwallet/extension-koni-ui/components/Account/Info/AvatarGroup';
import { Avatar } from '@subwallet/extension-koni-ui/components/Avatar';
import { useGetAccountByAddress } from '@subwallet/extension-koni-ui/hooks';
import { isAccountAll, toShort } from '@subwallet/extension-koni-ui/utils';
import CN from 'classnames';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import { InfoItemBase } from './types';
import { _ChainInfo } from '@subwallet/chain-list/types';
import useFetchChainInfo from '../../../hooks/screen/common/useFetchChainInfo';
import { _reformatAddressWithChain } from '@subwallet/extension-base/utils';

export interface AccountInfoItem extends InfoItemBase {
  address: string;
  name?: string;
  networkPrefix?: number;
  accounts?: BaseAccountInfo[];
  originChain?: _ChainInfo;
}

const Component: React.FC<AccountInfoItem> = (props: AccountInfoItem) => {
  const { accounts,originChain, address: accountAddress, className, label, name: accountName, networkPrefix: addressPrefix, valueColorSchema = 'default' } = props;

  const { t } = useTranslation();
  const account = useGetAccountByAddress(accountAddress);

  const originChainInfo = originChain && useFetchChainInfo(originChain?.slug);
  const formattedAddress = originChainInfo ? _reformatAddressWithChain(accountAddress, originChainInfo) : accountAddress;
  const shortAddress = toShort(formattedAddress);
  const name = useMemo(() => {
    return accountName || account?.name;
  }, [account?.name, accountName]);
  const isAll = useMemo(() => isAccountAll(accountAddress), [accountAddress]);

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
                  <Avatar
                    className={'__account-avatar'}
                    identPrefix={addressPrefix}
                    size={24}
                    value={accountAddress}
                  />
                  <div className={'__account-name ml-xs'}>
                    <div className={'__account-item-name'}>{name}</div>
                    <div className={'__account-item-address'}>{shortAddress}</div>
                  </div>
                </>
              )
          }
        </div>
      </div>
    </div>
  );
};

const AccountItem = styled(Component)<AccountInfoItem>(({ theme: { token } }: AccountInfoItem) => {
  return {};
});

export default AccountItem;
