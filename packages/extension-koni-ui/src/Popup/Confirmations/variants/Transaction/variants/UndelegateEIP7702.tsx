// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

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
  const data = transaction.data as ExtrinsicDataTypeMap[ExtrinsicType.EIP7702_UNDELEGATE];
  const chainInfo = useChainInfo(transaction.chain)!;

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
          label={t('Undelegate network')}
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

const UndelegateEIP7702 = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {
    '&.alert-area': {
      marginTop: token.marginSM
    }
  };
});

export default UndelegateEIP7702;
