// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ClaimAvailBridgeNotificationMetadata, ClaimPolygonBridgeNotificationMetadata } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';
import { SWTransactionResult } from '@subwallet/extension-base/services/transaction-service/types';
import { RequestClaimBridge } from '@subwallet/extension-base/types/bridge';
import { CommonTransactionInfo, MetaInfo } from '@subwallet/extension-koni-ui/components';
import { useGetChainAssetInfo, useGetNativeTokenBasicInfo, useTranslation } from '@subwallet/extension-koni-ui/hooks';
import { AlertDialogProps, ThemeProps } from '@subwallet/extension-koni-ui/types';
import CN from 'classnames';
import React, { useMemo } from 'react';
import styled from 'styled-components';

export interface BaseTransactionConfirmationProps extends ThemeProps {
  transaction: SWTransactionResult;
  openAlert: (alertProps: AlertDialogProps) => void;
  closeAlert: VoidFunction;
}

const Component: React.FC<BaseTransactionConfirmationProps> = (props: BaseTransactionConfirmationProps) => {
  const { className, transaction } = props;
  const data = transaction.data as RequestClaimBridge;

  const isPolygonBridge = useMemo(() => {
    return data.notification?.actionType === 'CLAIM_POLYGON_BRIDGE';
  }, [data.notification?.actionType]);

  const metadata = useMemo(() => {
    if (isPolygonBridge) {
      return data?.notification?.metadata as ClaimPolygonBridgeNotificationMetadata;
    }

    return data?.notification?.metadata as ClaimAvailBridgeNotificationMetadata;
  }, [isPolygonBridge, data.notification.metadata]);

  const amountValue = useMemo(() => {
    if (!isPolygonBridge && 'amount' in metadata) {
      return metadata.amount;
    } else if ('amounts' in metadata) {
      return metadata.amounts[0];
    }

    return 0;
  }, [isPolygonBridge, metadata]);

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
              value={amountValue}
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

const ClaimBridgeTransactionConfirmation = styled(Component)<BaseTransactionConfirmationProps>(({ theme: { token } }: BaseTransactionConfirmationProps) => {
  return {};
});

export default ClaimBridgeTransactionConfirmation;
