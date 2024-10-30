// Copyright 2019-2022 @subwallet/extension-web-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { RequestYieldStepSubmit, SubmitJoinNominationPool } from '@subwallet/extension-base/types';
import { AlertBox } from '@subwallet/extension-web-ui/components';
import CommonTransactionInfo from '@subwallet/extension-web-ui/components/Confirmation/CommonTransactionInfo';
import MetaInfo from '@subwallet/extension-web-ui/components/MetaInfo/MetaInfo';
import useGetNativeTokenBasicInfo from '@subwallet/extension-web-ui/hooks/common/useGetNativeTokenBasicInfo';
import CN from 'classnames';
import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import { BaseTransactionConfirmationProps } from './Base';

type Props = BaseTransactionConfirmationProps;

const Component: React.FC<Props> = (props: Props) => {
  const { className, transaction } = props;
  const requestData = transaction.data as RequestYieldStepSubmit;
  const data = requestData.data as SubmitJoinNominationPool;

  const { t } = useTranslation();
  const { decimals, symbol } = useGetNativeTokenBasicInfo(transaction.chain);

  return (
    <div className={CN(className)}>
      <CommonTransactionInfo
        address={transaction.address}
        network={transaction.chain}
      />
      <MetaInfo
        className={'meta-info'}
        hasBackgroundWrapper
      >
        <MetaInfo.Account
          address={data.selectedPool.address}
          label={t('Pool')}
          networkPrefix={42}
        />

        {/* <MetaInfo.AccountGroup */}
        {/*  accounts={data.address} */}
        {/*  content={t(`${data.selectedValidators.length} selected validators`)} */}
        {/*  label={t('Pool')} */}
        {/* /> */}

        <MetaInfo.Number
          decimals={decimals}
          label={t('Amount')}
          suffix={symbol}
          value={data.amount}
        />

        <MetaInfo.Number
          decimals={decimals}
          label={t('Estimated fee')}
          suffix={symbol}
          value={transaction.estimateFee?.value || 0}
        />
      </MetaInfo>

      <AlertBox
        className={'description'}
        description={t('Once staked, your funds will be locked and become non-transferable. ' +
          'To unlock your funds, you need to unstake manually, wait for the unstaking period to' +
          ' end and then withdraw manually.')}
        title={t('Your staked funds will be locked')}
        type='warning'
      />
    </div>
  );
};

const StakeTransactionConfirmation = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {
    '.description': {
      marginTop: token.marginSM
    }
  };
});

export default StakeTransactionConfirmation;
