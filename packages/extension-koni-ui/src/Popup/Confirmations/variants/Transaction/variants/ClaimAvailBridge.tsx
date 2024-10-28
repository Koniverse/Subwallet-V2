// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ClaimAvailBridgeNotificationMetadata } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';
import { SWTransactionResult } from '@subwallet/extension-base/services/transaction-service/types';
import { RequestClaimAvailBridge } from '@subwallet/extension-base/types/avail-bridge';
import { CommonTransactionInfo, MetaInfo } from '@subwallet/extension-koni-ui/components';
import { useGetChainAssetInfo, useGetNativeTokenBasicInfo, useTranslation } from '@subwallet/extension-koni-ui/hooks';
import { AlertDialogProps, ThemeProps } from '@subwallet/extension-koni-ui/types';
import CN from 'classnames';
import React from 'react';
import styled from 'styled-components';

export interface BaseTransactionConfirmationProps extends ThemeProps {
  transaction: SWTransactionResult;
  openAlert: (alertProps: AlertDialogProps) => void;
  closeAlert: VoidFunction;
}

const Component: React.FC<BaseTransactionConfirmationProps> = (props: BaseTransactionConfirmationProps) => {
  const { className, transaction } = props;
  const data = transaction.data as RequestClaimAvailBridge;
  const metadata = data.notification.metadata as ClaimAvailBridgeNotificationMetadata;

  const { t } = useTranslation();

  const nativeToken = useGetNativeTokenBasicInfo(transaction.chain);
  const claimToken = useGetChainAssetInfo(metadata.tokenSlug);

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
        {
          claimToken && (
            <MetaInfo.Number
              decimals={claimToken.decimals || 0}
              label={t('Amount')}
              suffix={claimToken.symbol}
              value={metadata.amount}
            />
          )
        }
        <MetaInfo.Number
          decimals={nativeToken.decimals}
          label={t('Estimated fee')}
          suffix={nativeToken.symbol}
          value={transaction.estimateFee?.value || 0}
        />
      </MetaInfo>
    </div>
  );
};

const ClaimAvailBridgeTransactionConfirmation = styled(Component)<BaseTransactionConfirmationProps>(({ theme: { token } }: BaseTransactionConfirmationProps) => {
  return {};
});

export default ClaimAvailBridgeTransactionConfirmation;
