// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainInfo } from '@subwallet/chain-list/types';
import { ExtrinsicDataTypeMap, ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import MetaInfo from '@subwallet/extension-koni-ui/components/MetaInfo/MetaInfo';
import { useGetChainInfoByChainId } from '@subwallet/extension-koni-ui/hooks';
import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import { BaseTransactionConfirmationProps } from './Base';

type Props = BaseTransactionConfirmationProps;

const Component: React.FC<Props> = ({ className, transaction }: Props) => {
  const { t } = useTranslation();
  const data = transaction.data as ExtrinsicDataTypeMap[ExtrinsicType.EIP7683_SWAP];
  const sourceChain = useGetChainInfoByChainId(data.sourceChainId) as _ChainInfo;
  const targetChain = useGetChainInfoByChainId(data.targetChainId) as _ChainInfo;

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
