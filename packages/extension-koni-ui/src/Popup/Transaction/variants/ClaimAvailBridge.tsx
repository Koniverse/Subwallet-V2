// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _ChainAsset } from '@subwallet/chain-list/types';
import { AmountData, ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import { _NotificationInfo, ClaimAvailBridgeNotificationMetadata } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';
import { AccountSelector, HiddenInput, MetaInfo, PageWrapper } from '@subwallet/extension-koni-ui/components';
import { useGetChainAssetInfo, useGetChainPrefixBySlug, useHandleSubmitTransaction, useInitValidateTransaction, usePreCheckAction, useRestoreTransaction, useSelector, useTransactionContext, useWatchTransaction } from '@subwallet/extension-koni-ui/hooks';
import { submitClaimAvailBridge } from '@subwallet/extension-koni-ui/messaging/transaction/avail-bridge';
import { getInappNotification } from '@subwallet/extension-koni-ui/messaging/transaction/notification';
import { ClaimAvailBridgeParams, FormCallbacks, FormFieldData, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { convertFieldToObject, simpleCheckForm } from '@subwallet/extension-koni-ui/utils';
import { Button, Form, Icon } from '@subwallet/react-ui';
import CN from 'classnames';
import { ArrowCircleRight, XCircle } from 'phosphor-react';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

import { FreeBalance, TransactionContent, TransactionFooter } from '../parts';

type Props = ThemeProps;
interface ComponentProps {
  notification: _NotificationInfo;
}

const hideFields: Array<keyof ClaimAvailBridgeParams> = ['chain', 'notificationId', 'asset'];
const validateFields: Array<keyof ClaimAvailBridgeParams> = ['from'];

const Component: React.FC<ComponentProps> = (props: ComponentProps) => {
  const navigate = useNavigate();
  const { notification } = props;

  const { defaultData, persistData } = useTransactionContext<ClaimAvailBridgeParams>();

  const [form] = Form.useForm<ClaimAvailBridgeParams>();
  const formDefault = useMemo((): ClaimAvailBridgeParams => ({ ...defaultData }), [defaultData]);

  const { accounts } = useSelector((state) => state.accountState);
  const { chainInfoMap } = useSelector((state) => state.chainStore);

  const metadata = notification?.metadata as ClaimAvailBridgeNotificationMetadata;

  const fromValue = useWatchTransaction('from', form, defaultData);
  const chainValue = useWatchTransaction('chain', form, defaultData);
  const networkPrefix = useGetChainPrefixBySlug(chainValue);
  const { decimals: _decimals, symbol } = useGetChainAssetInfo(metadata.tokenSlug) as _ChainAsset;
  const decimals = _decimals || 0;

  const [isDisable, setIsDisable] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isBalanceReady, setIsBalanceReady] = useState(true);

  const handleDataForInsufficientAlert = useCallback(
    (estimateFee: AmountData) => {
      return {
        chainName: chainInfoMap[chainValue]?.name || '',
        symbol: estimateFee.symbol
      };
    },
    [chainInfoMap, chainValue]
  );

  const { onError, onSuccess } = useHandleSubmitTransaction(undefined, handleDataForInsufficientAlert);

  const goHome = useCallback(() => {
    navigate('/home/tokens');
  }, [navigate]);

  const onFieldsChange: FormCallbacks<ClaimAvailBridgeParams>['onFieldsChange'] = useCallback((changedFields: FormFieldData[], allFields: FormFieldData[]) => {
    // TODO: field change
    const { empty, error } = simpleCheckForm(allFields, ['--asset']);

    const allMap = convertFieldToObject<ClaimAvailBridgeParams>(allFields);

    setIsDisable(error || empty);
    persistData(allMap);
  }, [persistData]);

  const { t } = useTranslation();

  const onSubmit: FormCallbacks<ClaimAvailBridgeParams>['onFinish'] = useCallback((values: ClaimAvailBridgeParams) => {
    setLoading(true);

    const { chain, from } = values;

    setTimeout(() => {
      submitClaimAvailBridge({
        address: from,
        chain: chain,
        notification
      })
        .then(onSuccess)
        .catch(onError)
        .finally(() => {
          setLoading(false);
        });
    }, 300);
  }, [notification, onError, onSuccess]);

  const checkAction = usePreCheckAction(fromValue);

  useRestoreTransaction(form);
  useInitValidateTransaction(validateFields, form, defaultData);

  const accountList = useMemo(() => {
    return accounts.filter((account) => account.address.toLowerCase() === fromValue.toLowerCase());
  }, [accounts, fromValue]);

  return (
    <>
      <TransactionContent>
        <Form
          className={CN('form-container form-space-sm')}
          form={form}
          initialValues={formDefault}
          onFieldsChange={onFieldsChange}
          onFinish={onSubmit}
        >
          <HiddenInput fields={hideFields} />
          <Form.Item
            name={'from'}
          >
            <AccountSelector
              addressPrefix={networkPrefix}
              disabled={true}
              externalAccounts={accountList}
            />
          </Form.Item>
          <FreeBalance
            address={fromValue}
            chain={chainValue}
            className={'free-balance'}
            label={t('Available balance:')}
            onBalanceReady={setIsBalanceReady}
          />
          <Form.Item>
            <MetaInfo
              className='claim-avail-bridge-meta-info'
              hasBackgroundWrapper={true}
            >
              <MetaInfo.Chain
                chain={chainValue}
                label={t('Network')}
              />
              {
                metadata && (
                  <MetaInfo.Number
                    decimals={decimals}
                    label={t('Token claiming')}
                    suffix={symbol}
                    value={metadata.amount}
                  />
                )
              }
            </MetaInfo>
          </Form.Item>
        </Form>
      </TransactionContent>
      <TransactionFooter>
        <Button
          disabled={loading}
          icon={(
            <Icon
              phosphorIcon={XCircle}
              weight='fill'
            />
          )}
          onClick={goHome}
          schema={'secondary'}
        >
          {t('Cancel')}
        </Button>

        <Button
          disabled={isDisable || !isBalanceReady}
          icon={(
            <Icon
              phosphorIcon={ArrowCircleRight}
              weight='fill'
            />
          )}
          loading={loading}
          onClick={checkAction(form.submit, ExtrinsicType.CLAIM_AVAIL_BRIDGE)}
        >
          {t('Continue')}
        </Button>
      </TransactionFooter>
    </>
  );
};

const Wrapper: React.FC<Props> = (props: Props) => {
  const { className } = props;

  const navigate = useNavigate();

  const { defaultData } = useTransactionContext<ClaimAvailBridgeParams>();
  const { notificationId } = defaultData;

  const [notification, setNotification] = useState<_NotificationInfo>();

  const promiseGetNoti = useMemo(() => {
    return new Promise<boolean>((resolve) => {
      getInappNotification(notificationId)
        .then((rs) => {
          setNotification(rs);
        })
        .catch(() => {
          setNotification(undefined);
          navigate('/home/tokens');
        })
        .finally(() => {
          resolve(true);
        })
      ;
    });
  }, [notificationId, navigate]);

  return (
    <PageWrapper
      className={CN(className, 'page-wrapper')}
      resolve={promiseGetNoti}
    >
      { notification && <Component notification={notification} /> }
    </PageWrapper>
  );
};

const ClaimAvailBridge = styled(Wrapper)<Props>(({ theme: { token } }: Props) => {
  return {
    '&.page-wrapper': {
      height: 'auto',
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    },

    '.free-balance': {
      marginBottom: token.marginXS
    },

    '.meta-info': {
      marginTop: token.paddingSM
    },

    '.claim-avail-bridge-meta-info': {
      marginTop: token.marginXXS
    }
  };
});

export default ClaimAvailBridge;
