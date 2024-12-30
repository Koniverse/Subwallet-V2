// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainInfo } from '@subwallet/chain-list/types';
import { ExtrinsicDataTypeMap, ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import { _getAssetSymbol } from '@subwallet/extension-base/services/chain-service/utils';
import { SwapTxData } from '@subwallet/extension-base/types';
import { AlertBox } from '@subwallet/extension-koni-ui/components';
import MetaInfo from '@subwallet/extension-koni-ui/components/MetaInfo/MetaInfo';
import { SwapRoute, SwapTransactionBlock } from '@subwallet/extension-koni-ui/components/Swap';
import { useGetChainAssetInfo, useGetChainInfoByChainId } from '@subwallet/extension-koni-ui/hooks';
import { Number } from '@subwallet/react-ui';
import CN from 'classnames';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import { BaseTransactionConfirmationProps } from './Base';

type Props = BaseTransactionConfirmationProps;

const Component: React.FC<Props> = ({ className, transaction }: Props) => {
  const { t } = useTranslation();
  const data = transaction.data as ExtrinsicDataTypeMap[ExtrinsicType.EIP7683_SWAP];
  const targetChain = useGetChainInfoByChainId(data.targetChainId) as _ChainInfo;
  const fromAssetInfo = useGetChainAssetInfo(data.paths[0]);
  const toAssetInfo = useGetChainAssetInfo(data.paths[data.paths.length - 1]);

  const swapInfo = useMemo((): SwapTxData => {
    return {
      quote: {
        fromAmount: data.amount,
        toAmount: data.amountOut,
        pair: {
          from: data.paths[0],
          to: data.paths[data.paths.length - 1]
        },
        route: {
          path: data.paths
        }
      }
    } as SwapTxData;
  }, [data.amount, data.amountOut, data.paths]);

  const renderRateConfirmInfo = useMemo(() => {
    return (
      <div className={'__quote-rate-wrapper'}>
        <Number
          decimal={0}
          suffix={_getAssetSymbol(fromAssetInfo)}
          value={1}
        />
        <span>&nbsp;~&nbsp;</span>
        <Number
          decimal={0}
          suffix={_getAssetSymbol(toAssetInfo)}
          value={data.rate}
        />
      </div>
    );
  }, [data.rate, fromAssetInfo, toAssetInfo]);

  return (
    <div className={CN(className)}>
      <SwapTransactionBlock
        data={swapInfo}
      />
      <MetaInfo className={CN('__swap-confirmation-wrapper')}>
        <MetaInfo.Account
          address={data.sourceAddress}
          className={'__recipient-item'}
          label={t('Recipient')}
        />
        <MetaInfo.Chain
          chain={targetChain.slug}
          className={'__to-chain-time'}
          label={t('To Chain')}
          valueColorSchema={'gray'}
        />
        <MetaInfo.Default
          className={'__quote-rate-confirm'}
          label={t('Quote rate')}
          valueColorSchema={'gray'}
        >
          {renderRateConfirmInfo}
        </MetaInfo.Default>
        <MetaInfo.Default
          className={'-d-column'}
          label={t('Swap route')}
        >
          <></>
        </MetaInfo.Default>
        <SwapRoute swapRoute={swapInfo.quote.route} />
        <AlertBox
          className={'__swap-quote-expired'}
          description={t('Not enough USDC on Sepolia. USDC on Ithaca will be used instead.')}
          title={t('Pay attention!')}
          type='info'
        />
      </MetaInfo>
    </div>
  );
};

const SwapEIP7683 = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {
    '.__quote-rate-wrapper': {
      display: 'flex'
    },
    '.__swap-arrival-time': {
      marginTop: 12
    },
    '.__swap-quote-expired': {
      marginTop: 12
    },
    '.__swap-confirmation-wrapper': {
      paddingLeft: token.paddingXS,
      paddingRight: token.paddingXS
    },
    '.__summary-to, .__summary-from': {
      display: 'flex',
      alignItems: 'center',
      flexDirection: 'column',
      flex: 1
    },
    '.__quote-rate-confirm .__label-col': {
      flex: '0 1 auto'
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
    '.__to-chain-time .__label': {
      fontSize: 14,
      color: token.colorTextTertiary,
      fontWeight: token.fontWeightStrong,
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

export default SwapEIP7683;
