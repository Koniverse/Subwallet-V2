// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ExtrinsicDataTypeMap, ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import MetaInfo from '@subwallet/extension-koni-ui/components/MetaInfo/MetaInfo';
import { useGetChainInfoByChainId, useGetNativeTokenBasicInfo } from '@subwallet/extension-koni-ui/hooks';
import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import { BaseTransactionConfirmationProps } from './Base';

type Props = BaseTransactionConfirmationProps;

const Component: React.FC<Props> = ({ className, transaction }: Props) => {
  const { t } = useTranslation();
  const data = transaction.data as ExtrinsicDataTypeMap[ExtrinsicType.EIP7683_SWAP];
  const sourceChain = useGetChainInfoByChainId(data.sourceChainId)!;
  const targetChain = useGetChainInfoByChainId(data.targetChainId)!;

  console.log(data);

  const { decimals: chainDecimals, symbol: chainSymbol } = useGetNativeTokenBasicInfo(transaction.chain);

  return (
    <>
      <MetaInfo hasBackgroundWrapper>
        <MetaInfo.Chain
          chain={sourceChain.slug}
          label={t('From Chain')}
        />
        <MetaInfo.Account
          address={data.sourceAddress}
          label={t('From account')}
        />
        <MetaInfo.Chain
          chain={targetChain.slug}
          label={t('To Chain')}
        />
        <MetaInfo.Account
          address={data.targetAddress}
          label={t('To account')}
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

const SwapEIP7683 = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {
    '&.alert-area': {
      marginTop: token.marginSM
    }
  };
});

export default SwapEIP7683;
