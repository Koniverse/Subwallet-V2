// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NotificationType } from '@subwallet/extension-base/background/KoniTypes';
import { _ChainConnectionStatus } from '@subwallet/extension-base/services/chain-service/types';
import { CHAIN_CONNECT_STATUS_NEED_CHECK } from '@subwallet/extension-koni-ui/constants';
import { enableChain } from '@subwallet/extension-koni-ui/messaging';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import { Button } from '@subwallet/react-ui';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

import { useNotification, useTranslation } from '../common';
import useOpenUpdateChainModal from './useOpenUpdateChainModal';

export default function useChainChecker () {
  const { t } = useTranslation();
  const { chainInfoMap, chainStateMap } = useSelector((root: RootState) => root.chainStore);
  const notify = useNotification();
  const [connectingChain, setConnectingChain] = useState<string | null>(null);
  const openCheckModal = useOpenUpdateChainModal();

  const chainRef = useRef('');
  const updateChainRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (connectingChain && chainStateMap[connectingChain]?.connectionStatus === _ChainConnectionStatus.CONNECTED) {
      const chainInfo = chainInfoMap[connectingChain];

      notify({ message: t('Chain {{name}} is connected', { replace: { name: chainInfo?.name } }), type: NotificationType.SUCCESS, duration: 3 });
      setConnectingChain(null);
    }
  }, [connectingChain, chainInfoMap, chainStateMap, notify, t]);

  const _ensureChainEnable = useCallback((chain: string) => {
    clearTimeout(timeoutRef.current);

    if (chainRef.current !== chain) {
      updateChainRef.current = false;
    }

    chainRef.current = chain;

    const chainState = chainStateMap[chain];
    const chainInfo = chainInfoMap[chain];

    if (chainState) {
      if (!chainState.active) {
        const message = t('{{name}} is not ready to use, do you want to turn it on?', { replace: { name: chainInfo?.name } });

        const _onEnabled = () => {
          enableChain(chain, false).then(() => {
            const chainInfo = chainInfoMap[chain];

            setConnectingChain(chain);
            notify({ message: t('Chain {{name}} is connecting', { replace: { name: chainInfo?.name } }), duration: 1.5, type: 'warning' });
          }).catch(console.error);
        };

        const btn = <Button
          // eslint-disable-next-line react/jsx-no-bind
          onClick={_onEnabled}
          schema={'warning'}
          size={'xs'}
        >
          {t('Turn it on')}
        </Button>;

        notify({
          message,
          type: NotificationType.WARNING,
          duration: 3,
          btn
        });
      } else if (chainState && CHAIN_CONNECT_STATUS_NEED_CHECK.includes(chainState.connectionStatus)) {
        timeoutRef.current = setTimeout(() => {
          if (!updateChainRef.current && chainRef.current === chain) {
            openCheckModal(chain);
            updateChainRef.current = true;
          }
        }, 3000);
      }
    }
  }, [chainInfoMap, chainStateMap, notify, openCheckModal, t]);

  return _ensureChainEnable;
}
