// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { DEFAULT_OFF_RAMP_PARAMS, OFF_RAMP_DATA } from '@subwallet/extension-web-ui/constants';
import { ThemeProps } from '@subwallet/extension-web-ui/types';
import React, { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { useLocalStorage } from 'usehooks-ts';

import { LoadingScreen } from '../components';

type Props = ThemeProps;

function getOffRampData (orderId: string, searchParams: URLSearchParams) {
  return {
    orderId,
    slug: searchParams.get('slug') || '',
    partnerCustomerId: searchParams.get('partnerCustomerId') || '',
    cryptoCurrency: searchParams.get('cryptoCurrency') || '',
    cryptoAmount: searchParams.get('cryptoAmount') || '',
    numericCryptoAmount: parseFloat(searchParams.get('cryptoAmount') || '0'),
    walletAddress: searchParams.get('walletAddress') || '',
    network: searchParams.get('network') || ''
  };
}

function Component ({ className = '' }: Props): React.ReactElement<Props> {
  const navigate = useNavigate();
  // Pathname query
  const [, setStorage] = useLocalStorage(OFF_RAMP_DATA, DEFAULT_OFF_RAMP_PARAMS);
  const [searchParams, setSearchParams] = useSearchParams();
  const orderId = searchParams.get('orderId') || '';

  const details = useMemo(() => {
    return getOffRampData(orderId, searchParams);
  }, [orderId, searchParams]);

  useEffect(() => {
    if (orderId) {
      setStorage(details);
      navigate('/home/tokens');
    }
  }, [details, orderId, setStorage, navigate]);

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
