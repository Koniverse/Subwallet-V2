// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { LoadingScreen, PageWrapper } from '@subwallet/extension-koni-ui/components';
import { DataContext } from '@subwallet/extension-koni-ui/contexts/DataContext';
import { useGroupYieldPosition, useSelector, useSetCurrentPage } from '@subwallet/extension-koni-ui/hooks';
import EarningOptions from '@subwallet/extension-koni-ui/Popup/Home/Earning/EarningEntry/EarningOptions';
import EarningPositions from '@subwallet/extension-koni-ui/Popup/Home/Earning/EarningEntry/EarningPositions';
import { EarningEntryParam, EarningEntryView, ThemeProps } from '@subwallet/extension-koni-ui/types';
import CN from 'classnames';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';

type Props = ThemeProps;

function Component () {
  useSetCurrentPage('/home/earning');
  const locationState = useLocation().state as EarningEntryParam;
  const { currentAccountProxy } = useSelector((state) => state.accountState);
  const currentAccountProxyRef = useRef(currentAccountProxy?.id);
  const [entryView, setEntryView] = useState<EarningEntryView>(locationState?.view || EarningEntryView.POSITIONS);
  const [loading, setLoading] = useState<boolean>(false);

  const earningPositions = useGroupYieldPosition();

  useEffect(() => {
    if (currentAccountProxyRef.current !== currentAccountProxy?.id) {
      currentAccountProxyRef.current = currentAccountProxy?.id;

      setEntryView(EarningEntryView.POSITIONS);
    }
  }, [currentAccountProxy?.id]);

  if (loading) {
    return (<LoadingScreen />);
  }

  return earningPositions.length && entryView === EarningEntryView.POSITIONS
    ? (
      <EarningPositions
        earningPositions={earningPositions}
        setEntryView={setEntryView}
        setLoading={setLoading}
      />
    )
    : (
      <EarningOptions
        hasEarningPositions={!!earningPositions.length}
        setEntryView={setEntryView}
      />
    );
}

const Wrapper = ({ className }: Props) => {
  const dataContext = useContext(DataContext);

  return (
    <PageWrapper
      className={CN(className)}
      resolve={dataContext.awaitStores(['earning', 'price', 'balance'])}
    >
      <Component />
    </PageWrapper>
  );
};

const EarningEntry = styled(Wrapper)<Props>(({ theme: { token } }: Props) => ({

}));

export default EarningEntry;
