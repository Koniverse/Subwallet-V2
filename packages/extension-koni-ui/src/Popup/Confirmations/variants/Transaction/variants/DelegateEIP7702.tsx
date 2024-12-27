// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainInfo } from '@subwallet/chain-list/types';
import { ExtrinsicDataTypeMap, ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import MetaInfo from '@subwallet/extension-koni-ui/components/MetaInfo/MetaInfo';
import { useChainInfo, useGetNativeTokenBasicInfo } from '@subwallet/extension-koni-ui/hooks';
import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import { BaseTransactionConfirmationProps } from './Base';

type Props = BaseTransactionConfirmationProps;

const Component: React.FC<Props> = ({ className, transaction }: Props) => {
  const { t } = useTranslation();
  const data = transaction.data as ExtrinsicDataTypeMap[ExtrinsicType.EIP7702_DELEGATE];
  const chainInfo = useChainInfo(transaction.chain) as _ChainInfo;

  const { decimals: chainDecimals, symbol: chainSymbol } = useGetNativeTokenBasicInfo(transaction.chain);

  return (
    <>
      <MetaInfo hasBackgroundWrapper>
        <MetaInfo.Account
          address={data.address}
          label={t('Account')}
        />
        <MetaInfo.Chain
          chain={chainInfo.slug}
          label={t('Delegate network')}
        />
        <MetaInfo.DisplayType
          label={t('Delegate type')}
          typeName={data.delegateType}
        />
        <MetaInfo.Account
          address={data.delegateAddress}
          label={t('Delegate address')}
        />
      </MetaInfo>

      <MetaInfo hasBackgroundWrapper>
        <MetaInfo.Number
          decimals={chainDecimals}
          label={t('Estimated fee')}
          suffix={chainSymbol}
          value={transaction.estimateFee?.value || 0}
        />
      </MetaInfo>
    </>
  );
};

const DelegateEIP7702 = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {
    '&.alert-area': {
      marginTop: token.marginSM
    }
  };
});

export default DelegateEIP7702;
