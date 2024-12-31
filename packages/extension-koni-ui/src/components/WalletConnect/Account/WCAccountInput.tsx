// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountJson } from '@subwallet/extension-base/types';
import { isSameAddress } from '@subwallet/extension-base/utils';
import { AccountItemBase } from '@subwallet/extension-koni-ui/components/Account';
import { AccountProxyAvatarGroup } from '@subwallet/extension-koni-ui/components/AccountProxy';
import { useTranslation } from '@subwallet/extension-koni-ui/hooks';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import { Icon } from '@subwallet/react-ui';
import CN from 'classnames';
import { DotsThree } from 'phosphor-react';
import React, { useMemo } from 'react';
import styled from 'styled-components';

interface Props extends ThemeProps {
  accounts: AccountJson[];
  selected: string[];
  onClick: () => void;
}

const Component: React.FC<Props> = (props: Props) => {
  const { accounts, selected } = props;

  const { t } = useTranslation();

  const selectedAccounts = useMemo(() => accounts.filter((account) => selected.some((address) => isSameAddress(address, account.address))), [accounts, selected]);
  const basicAccountProxiesInfo = useMemo(() => {
    return selectedAccounts.map((account) => {
      return {
        id: account.proxyId || '',
        name: account.name
      };
    });
  }, [selectedAccounts]);
  const countSelected = selectedAccounts.length;

  return (
    <AccountItemBase
      {...props}
      address=''
      className={CN('wallet-connect-account-input', props.className)}
      leftItem={<AccountProxyAvatarGroup accountProxies={basicAccountProxiesInfo} />}
      middleItem={(
        <div className={CN('wallet-connect-account-input-content')}>
          { countSelected ? t('{{number}} accounts connected', { replace: { number: countSelected } }) : t('Select account')}
        </div>
      )}
      rightItem={(
        <div className={'more-icon'}>
          <Icon
            iconColor='var(--icon-color)'
            phosphorIcon={DotsThree}
            size='md'
            type='phosphor'
            weight='fill'
          />
        </div>
      )}
    />
  );
};

const WCAccountInput = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {
    '.wc-network-modal-content': {
      textAlign: 'left'
    },

    '.more-icon': {
      display: 'flex',
      width: 40,
      justifyContent: 'center'
    }
  };
});

export default WCAccountInput;
