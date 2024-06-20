// Copyright 2019-2022 @subwallet/extension-web-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _AssetType } from '@subwallet/chain-list/types';
import { ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import { _getAssetOriginChain, _getAssetPriceId, _getAssetSymbol } from '@subwallet/extension-base/services/chain-service/utils';
import { swapCustomFormatter } from '@subwallet/extension-base/utils';
import { useGetBalance, useSelector } from '@subwallet/extension-web-ui/hooks';
import { ThemeProps } from '@subwallet/extension-web-ui/types';
import { ActivityIndicator, Icon, Logo, ModalContext, Number } from '@subwallet/react-ui';
import BigN from 'bignumber.js';
import CN from 'classnames';
import { CheckCircle } from 'phosphor-react';
import React, { useCallback, useContext, useMemo } from 'react';
import styled from 'styled-components';

type Props = ThemeProps & {
  slug: string,
  amountToPay: string | number | BigN,
  selected?: boolean,
  onSelect?: (slug: string) => void,
  modalId: string,
  address: string,
  extrinsicType: ExtrinsicType
}
const numberMetadata = { maxNumberFormat: 8 };

const Component: React.FC<Props> = (props: Props) => {
  const { address, amountToPay, className, extrinsicType, modalId, onSelect, selected, slug } = props;
  const assetRegistryMap = useSelector((state) => state.assetRegistry.assetRegistry);
  const priceMap = useSelector((state) => state.price.priceMap);
  const { inactiveModal } = useContext(ModalContext);
  const _onSelect = useCallback(() => {
    onSelect?.(slug);
    inactiveModal(modalId);
  }, [inactiveModal, modalId, onSelect, slug]);

  const feeAssetInfo = useMemo(() => {
    return (slug ? assetRegistryMap[slug] : undefined);
  }, [assetRegistryMap, slug]);

  const chain = _getAssetOriginChain(feeAssetInfo);
  const { isLoading, nativeTokenBalance, tokenBalance } = useGetBalance(chain, address, slug, true, extrinsicType);

  const balance = useMemo(() => {
    if (feeAssetInfo?.assetType === _AssetType.LOCAL) {
      return tokenBalance;
    }

    return nativeTokenBalance;
  }, [feeAssetInfo?.assetType, nativeTokenBalance, tokenBalance]);

  const convertedAmountToPay = useMemo(() => {
    if (!priceMap[_getAssetPriceId(feeAssetInfo)] || !priceMap[_getAssetPriceId(feeAssetInfo)]) {
      return undefined;
    }

    return new BigN(amountToPay).div(priceMap[_getAssetPriceId(feeAssetInfo)] || 0);
  }, [amountToPay, feeAssetInfo, priceMap]);

  return (
    <>
      <div
        className={CN(className, '__choose-fee-item-wrapper')}
        onClick={_onSelect}
      >
        <div className={'__left-part'}>
          <Logo
            className='token-logo'
            isShowSubLogo={false}
            shape='squircle'
            size={40}
            token={slug.toLowerCase()}
          />
          <div className={'__fee-info'}>
            <div className={'__line-1'}>
              {convertedAmountToPay
                ? (<Number
                  className={'__amount-fee-info'}
                  customFormatter={swapCustomFormatter}
                  decimal={0}
                  formatType={'custom'}
                  metadata={numberMetadata}
                  suffix={_getAssetSymbol(feeAssetInfo)}
                  value={convertedAmountToPay}
                />)
                : <div className={'__fee-symbol'}>{_getAssetSymbol(feeAssetInfo)}</div>
              }
            </div>
            <div className={'__line-2'}>Available:&nbsp;
              {!isLoading
                ? (
                  <Number
                    className={'__available-fee-info'}
                    customFormatter={swapCustomFormatter}
                    decimal={balance.decimals}
                    formatType={'custom'}
                    metadata={numberMetadata}
                    suffix={_getAssetSymbol(feeAssetInfo)}
                    value={balance.value}
                  />
                )
                : (
                  <div className={'__process-item-loading'}>
                    <ActivityIndicator size={12} />
                  </div>
                )}
            </div>
          </div>
        </div>
        {selected && (
          <Icon
            className='check-icon'
            phosphorIcon={CheckCircle}
            size='md'
            weight='fill'
          />
        )}
      </div>
    </>
  );
};

const ChooseFeeItem = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: token.colorBgSecondary,
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    '.__left-part': {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    },
    '.__fee-info': {
      fontSize: 16,
      lineHeight: token.lineHeightLG,
      fontWeight: token.fontWeightStrong,
      color: token.colorWhite
    },
    '.__line-2': {
      display: 'flex',
      justifyContent: 'flex-start',
      alignItems: 'baseline',
      fontSize: token.fontSizeSM,
      fontWeight: token.fontWeightStrong,
      lineHeight: token.lineHeightSM,
      color: token.colorTextTertiary,
      '.ant-number-integer, .ant-number-suffix, .ant-number-decimal': {
        color: 'inherit !important',
        fontSize: 'inherit !important',
        fontWeight: `${token.fontWeightStrong}px !important`,
        lineHeight: 'inherit'
      }

    },
    '.__process-item-loading': {
      fontSize: token.fontSize,
      lineHeight: token.lineHeightSM
    },

    '.check-icon': {
      color: token.colorSuccess
    }
  };
});

export default ChooseFeeItem;
