// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { addLazy, toBNString } from '@subwallet/extension-base/utils';
import { DEFAULT_OFF_RAMP_PARAMS, DEFAULT_TRANSFER_PARAMS, OFF_RAMP_DATA, TRANSFER_TRANSACTION } from '@subwallet/extension-web-ui/constants';
import { ScreenContext } from '@subwallet/extension-web-ui/contexts/ScreenContext';
import { useGetChainAssetInfo, useNotification, useSelector, useTranslation } from '@subwallet/extension-web-ui/hooks';
import { RootState } from '@subwallet/extension-web-ui/stores';
import { OffRampParams, ThemeProps } from '@subwallet/extension-web-ui/types';
import React, { useCallback, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useLocalStorage } from 'usehooks-ts';

import { LoadingScreen } from '../components';

type Props = ThemeProps;

function Component ({ className = '' }: Props): React.ReactElement<Props> {
  // Handle Sell Token
  const { accounts } = useSelector((state: RootState) => state.accountState);
  const [, setStorage] = useLocalStorage(TRANSFER_TRANSACTION, DEFAULT_TRANSFER_PARAMS);
  const [offRampData] = useLocalStorage(OFF_RAMP_DATA, DEFAULT_OFF_RAMP_PARAMS);
  const notify = useNotification();
  const { t } = useTranslation();

  const addresses = accounts.map((account) => account.address);
  const { isWebUI } = useContext(ScreenContext);

  const data = offRampData;
  const TokenInfo = useGetChainAssetInfo(data.slug);

  console.log('Hiiii', TokenInfo);
  const navigate = useNavigate();

  const onOpenSellToken = useCallback((data: OffRampParams) => {
    const partnerCustomerId = data.partnerCustomerId;
    const walletAddress = data.walletAddress;
    const slug = data.slug;
    const address = partnerCustomerId;
    const bnAmount = toBNString(data.numericCryptoAmount.toString(), TokenInfo?.decimals || 0);
    console.log('Was here');
    const transferParams = {
      ...DEFAULT_TRANSFER_PARAMS,
      chain: TokenInfo?.originChain || '',
      destChain: TokenInfo?.originChain || '',
      asset: TokenInfo?.slug || '',
      from: address,
      defaultSlug: slug || '',
      to: walletAddress,
      value: bnAmount.toString()
    };

    setStorage(transferParams);

    if (!isWebUI) {
      navigate('/transaction/off-ramp-send-fund');
    } else {
      navigate('/transaction/home/tokens?onOpen=true');
      // activeModal(OFF_RAMP_TRANSACTION_TRANSFER_MODAL);
    }
  }, [TokenInfo?.decimals, TokenInfo?.originChain, TokenInfo?.slug, setStorage, isWebUI, navigate]);

  useEffect(() => {
    if (data.orderId && addresses.includes(data.partnerCustomerId)) {
      addLazy('redirectOffRamp', () => {
        onOpenSellToken(data);
      }, undefined, 30000, false);
    }
  }, [addresses, data, onOpenSellToken]);

  return (
    <>
      <LoadingScreen />
    </>
  );
}

const OffRampLoading = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return ({
    height: '100%'
  });
});

export default OffRampLoading;
