// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ACCOUNT_CHAIN_TYPE_ORDINAL_MAP, AccountChainType } from '@subwallet/extension-base/types';
import { Theme } from '@subwallet/extension-koni-ui/themes';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import { getChainTypeLogoMap } from '@subwallet/extension-koni-ui/utils';
import React, { Context, useContext, useMemo } from 'react';
import styled, { ThemeContext } from 'styled-components';

type Props = ThemeProps & {
  chainTypes: AccountChainType[];
}

function Component ({ chainTypes, className }: Props): React.ReactElement<Props> {
  const logoMap = useContext<Theme>(ThemeContext as Context<Theme>).logoMap;

  const chainTypeLogoMap = useMemo(() => {
    return getChainTypeLogoMap(logoMap);
  }, [logoMap]);

  const sortedChainTypes = useMemo(() => {
    const result = [...chainTypes];

    result.sort((a, b) => ACCOUNT_CHAIN_TYPE_ORDINAL_MAP[a] - ACCOUNT_CHAIN_TYPE_ORDINAL_MAP[b]);

    return result;
  }, [chainTypes]);

  return (
    <div className={className}>
      {
        sortedChainTypes.map((nt) => (
          <img
            alt='Chain type'
            className={'__chain-type-logo'}
            key={nt}
            src={chainTypeLogoMap[nt]}
          />
        ))
      }
    </div>
  );
}

const AccountChainTypeLogos = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {
    display: 'flex',
    alignItems: 'center',

    '.__chain-type-logo': {
      display: 'block',
      boxShadow: '-4px 0px 4px 0px rgba(0, 0, 0, 0.40)',
      width: token.size,
      height: token.size,
      borderRadius: '100%'
    },

    '.__chain-type-logo + .__chain-type-logo': {
      marginLeft: -token.marginXXS
    }
  };
});

export default AccountChainTypeLogos;
