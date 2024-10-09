// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _getAssetDecimals, _getAssetPriceId, _getAssetSymbol } from '@subwallet/extension-base/services/chain-service/utils';
import { BN_ZERO } from '@subwallet/extension-base/utils';
import { useSelector } from '@subwallet/extension-koni-ui/hooks';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import { Icon, ModalContext, Number } from '@subwallet/react-ui';
import BigN from 'bignumber.js';
import { PencilSimpleLine } from 'phosphor-react';
import React, { useCallback, useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import { FeeEditorModal } from './FeeEditorModal';

export type RenderFieldNodeParams = {
  isLoading: boolean;
  feeInfo: {
    decimals: number,
    symbol: string,
    value: BigN,
    convertedValue: BigN
  },
  disableEdit: boolean,
  onClickEdit: VoidFunction
}

type Props = ThemeProps & {
  onSelect?: () => void;
  isLoading?: boolean;
  tokenSlug: string;
  renderFieldNode?: (params: RenderFieldNodeParams) => React.ReactNode;
};

// todo: will update dynamic later
const modalId = 'FeeEditorModalId';

const Component = ({ className, isLoading = false, onSelect, renderFieldNode, tokenSlug }: Props): React.ReactElement<Props> => {
  const { t } = useTranslation();
  const { activeModal } = useContext(ModalContext);
  const assetRegistry = useSelector((root) => root.assetRegistry.assetRegistry);
  // @ts-ignore
  const priceMap = useSelector((state) => state.price.priceMap);

  const tokenAsset = (() => {
    return assetRegistry[tokenSlug] || undefined;
  })();

  const decimals = _getAssetDecimals(tokenAsset);
  // @ts-ignore
  const priceId = _getAssetPriceId(tokenAsset);
  const symbol = _getAssetSymbol(tokenAsset);

  const feeValue = useMemo(() => {
    return BN_ZERO;
  }, []);

  const feePriceValue = useMemo(() => {
    return BN_ZERO;
  }, []);

  const onClickEdit = useCallback(() => {
    setTimeout(() => {
      activeModal(modalId);
    }, 100);
  }, [activeModal]);

  const onSelectOption = useCallback(() => {
    onSelect?.();
  }, [onSelect]);

  const customFieldNode = useMemo(() => {
    if (!renderFieldNode) {
      return null;
    }

    return renderFieldNode({
      isLoading: isLoading,
      feeInfo: {
        decimals,
        symbol,
        value: feeValue,
        convertedValue: feePriceValue
      },
      disableEdit: isLoading,
      onClickEdit
    });
  }, [decimals, feeValue, isLoading, onClickEdit, renderFieldNode, symbol, feePriceValue]);

  return (
    <>
      {
        customFieldNode || (
          <div className={className}>
            <div className='__field-left-part'>
              <div className='__field-label'>
                {t('Estimate fee')}:
              </div>

              <Number
                className={'__fee-value'}
                decimal={decimals}
                suffix={symbol}
                value={feeValue}
              />
            </div>
            <div className='__field-right-part'>
              <div
                className='__fee-editor-area'
                onClick={onClickEdit}
              >
                <Number
                  className={'__fee-price-value'}
                  decimal={0}
                  prefix={'~ $'}
                  value={feePriceValue}
                />

                <Icon
                  className={'__edit-icon'}
                  customSize={'20px'}
                  phosphorIcon={PencilSimpleLine}
                />
              </div>
            </div>
          </div>
        )
      }

      <FeeEditorModal
        modalId={modalId}
        onSelectOption={onSelectOption}
      />
    </>
  );
};

const FeeEditor = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return ({
    display: 'flex',
    gap: token.sizeXS,
    minHeight: 24,
    alignItems: 'center',

    '.ant-number': {
      '&, .ant-typography': {
        color: 'inherit !important',
        fontSize: 'inherit !important',
        fontWeight: 'inherit !important',
        lineHeight: 'inherit'
      }
    },

    '.__field-left-part': {
      flex: 1,
      display: 'flex',
      gap: token.sizeXXS,
      fontSize: token.fontSize,
      lineHeight: token.lineHeight,
      color: token.colorTextLight4
    },

    '.__field-right-part': {

    },

    '.__fee-editor-area': {
      cursor: 'pointer',
      display: 'flex',
      gap: token.sizeXXS,
      fontSize: token.fontSize,
      lineHeight: token.lineHeight,
      color: token.colorTextLight1
    }
  });
});

export default FeeEditor;
