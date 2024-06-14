// Copyright 2019-2022 @subwallet/extension-web-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { RequestChangeFeeToken } from '@subwallet/extension-base/background/KoniTypes';
import { _getAssetDecimals, _getAssetPriceId, _getAssetSymbol } from '@subwallet/extension-base/services/chain-service/utils';
import { MetaInfo } from '@subwallet/extension-web-ui/components';
import { useSelector } from '@subwallet/extension-web-ui/hooks';
import BigN from 'bignumber.js';
import CN from 'classnames';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import { BaseTransactionConfirmationProps } from './Base';

type Props = BaseTransactionConfirmationProps;

const Component: React.FC<Props> = (props: Props) => {
  const { className, transaction } = props;
  const { t } = useTranslation();
  const assetRegistryMap = useSelector((state) => state.assetRegistry.assetRegistry);
  const { currencyData, priceMap } = useSelector((state) => state.price);

  const { convertedFeeAmount, selectedFeeToken } = useMemo(() => {
    return transaction.data as RequestChangeFeeToken;
  }, [transaction.data]);

  const selectedFeeTokenInfo = useMemo(() => {
    return assetRegistryMap[selectedFeeToken];
  }, [assetRegistryMap, selectedFeeToken]);

  const defaultFeeValueInFiatPrice = useMemo(() => {
    if (!transaction.estimateFee) {
      return '0';
    }

    const defaultFeeTokenInfo = assetRegistryMap[transaction.estimateFee.feeTokenSlug];

    const bnAmount = new BigN(transaction.estimateFee.value).shiftedBy(-1 * transaction.estimateFee.decimals);
    const price = priceMap[_getAssetPriceId(defaultFeeTokenInfo)] || 0;

    return bnAmount.multipliedBy(price).toString();
  }, [assetRegistryMap, priceMap, transaction.estimateFee]);

  return (
    <>
      <div className={CN(className)}>
        <MetaInfo
          hasBackgroundWrapper={true}
        >
          <MetaInfo.Chain
            chain={transaction.chain}
            label={t('Network')}
          />
          <MetaInfo.Default
            className={'__token-network-fee'}
            label={t('Token to paying fee')}
            valueColorSchema={'default'}
          >
            {_getAssetSymbol(selectedFeeTokenInfo)}
          </MetaInfo.Default>
          <MetaInfo.Number
            decimals={0}
            label={t('Estimated transaction fee')}
            prefix={(currencyData.isPrefix && currencyData.symbol) || ''}
            value={defaultFeeValueInFiatPrice}
          />
          <MetaInfo.Number
            className={'__convert-fee-value'}
            decimals={_getAssetDecimals(selectedFeeTokenInfo)}
            prefix={'~'}
            suffix={_getAssetSymbol(selectedFeeTokenInfo)}
            value={convertedFeeAmount}
          />
        </MetaInfo>
      </div>
    </>
  );
};

const SwapChooseFeeTransactionConfirmation = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {
    paddingTop: 10,
    '.__quote-rate-wrapper': {
      display: 'flex'
    },
    '.__swap-arrival-time': {
      marginTop: 12
    },
    '.__convert-fee-value.__row': {
      marginTop: 0
    },
    '.__swap-quote-expired': {
      marginTop: 12
    },
    '.__summary-to, .__summary-from': {
      display: 'flex',
      alignItems: 'center',
      flexDirection: 'column',
      flex: 1
    },
    '.__quote-footer-label': {
      color: token.colorTextTertiary,
      fontSize: 12,
      fontWeight: token.bodyFontWeight,
      lineHeight: token.lineHeightSM
    },
    '.__amount-destination': {
      color: token.colorTextLight2,
      fontSize: token.fontSizeLG,
      fontWeight: token.fontWeightStrong,
      lineHeight: token.lineHeightLG
    },
    '.__recipient-item .__label': {
      fontSize: 14,
      color: token.colorTextTertiary,
      fontWeight: token.fontWeightStrong,
      lineHeight: token.lineHeight
    },
    '.__recipient-item .__account-name': {
      fontSize: 14,
      color: token.colorWhite,
      fontWeight: token.bodyFontWeight,
      lineHeight: token.lineHeight
    },
    '.__quote-rate-confirm .__value': {
      fontSize: 14,
      color: token.colorWhite,
      fontWeight: token.bodyFontWeight,
      lineHeight: token.lineHeight
    },
    '.__estimate-transaction-fee .__value': {
      fontSize: 14,
      color: token.colorWhite,
      fontWeight: token.bodyFontWeight,
      lineHeight: token.lineHeight
    },
    '.__quote-rate-confirm.__quote-rate-confirm, .__estimate-transaction-fee.__estimate-transaction-fee, .-d-column.-d-column': {
      marginTop: 12
    },
    '.__swap-route-container': {
      marginBottom: 20
    },
    '.__quote-rate-confirm .__label': {
      fontSize: 14,
      color: token.colorTextTertiary,
      fontWeight: token.bodyFontWeight,
      lineHeight: token.lineHeight
    },
    '.__estimate-transaction-fee .__label': {
      fontSize: 14,
      color: token.colorTextTertiary,
      fontWeight: token.bodyFontWeight,
      lineHeight: token.lineHeight
    },
    '.-d-column .__label': {
      fontSize: 14,
      color: token.colorTextTertiary,
      fontWeight: token.bodyFontWeight,
      lineHeight: token.lineHeight
    }
  };
});

export default SwapChooseFeeTransactionConfirmation;
