// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ExtrinsicType, NotificationType } from '@subwallet/extension-base/background/KoniTypes';
import { EarningRewardHistoryItem, NominationYieldPositionInfo, PalletNominationPoolsClaimPermission, SpecialYieldPoolInfo, SpecialYieldPositionInfo, YieldPoolInfo, YieldPoolType, YieldPositionInfo } from '@subwallet/extension-base/types';
import { detectTranslate } from '@subwallet/extension-base/utils';
import { AlertModal, Layout, PageWrapper } from '@subwallet/extension-koni-ui/components';
import { EarningManageClaimPermissions } from '@subwallet/extension-koni-ui/components/Modal/Earning';
import { BN_TEN, BN_ZERO, DEFAULT_EARN_PARAMS, DEFAULT_UN_STAKE_PARAMS, EARN_TRANSACTION, EARNING_MANAGE_AUTO_CLAIM_MODAL, SET_CLAIM_PERMISSIONS, UN_STAKE_TRANSACTION } from '@subwallet/extension-koni-ui/constants';
import { DataContext } from '@subwallet/extension-koni-ui/contexts/DataContext';
import { useAlert, usePreCheckAction, useSelector, useTranslation, useYieldPositionDetail } from '@subwallet/extension-koni-ui/hooks';
import { yieldSubmitSetClaimPermissions } from '@subwallet/extension-koni-ui/messaging';
import { AccountAndNominationInfoPart } from '@subwallet/extension-koni-ui/Popup/Home/Earning/EarningPositionDetail/AccountAndNominationInfoPart';
import { EarningInfoPart } from '@subwallet/extension-koni-ui/Popup/Home/Earning/EarningPositionDetail/EarningInfoPart';
import { RewardInfoPart } from '@subwallet/extension-koni-ui/Popup/Home/Earning/EarningPositionDetail/RewardInfoPart';
import { WithdrawInfoPart } from '@subwallet/extension-koni-ui/Popup/Home/Earning/EarningPositionDetail/WithdrawInfoPart';
import { Theme } from '@subwallet/extension-koni-ui/themes';
import { EarningEntryParam, EarningEntryView, EarningPositionDetailParam, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { getBannerButtonIcon, isAccountAll } from '@subwallet/extension-koni-ui/utils';
import { BackgroundIcon, Button, ButtonProps, Icon, ModalContext, Number, Switch, Tag, Tooltip, Web3Block } from '@subwallet/react-ui';
import BigN from 'bignumber.js';
import CN from 'classnames';
import { GearSix, Info, MinusCircle, Plus, PlusCircle } from 'phosphor-react';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled, { useTheme } from 'styled-components';
import { useLocalStorage } from 'usehooks-ts';

import useNotification from '../../../../hooks/common/useNotification';

type Props = ThemeProps;

type ComponentProp = {
  compound: YieldPositionInfo;
  list: YieldPositionInfo[];
  poolInfo: YieldPoolInfo;
  rewardHistories: EarningRewardHistoryItem[];
}

const alertModalId = 'earn-position-detail-alert-modal';
const manageAutoClaimModalId = EARNING_MANAGE_AUTO_CLAIM_MODAL;
const messageRejectAccount = 'Rejected by user';
const earningMessageWatchOnly = detectTranslate('You are using a {{accountTitle}}. Earning is not supported with this account type');

function Component ({ compound,
  list,
  poolInfo,
  rewardHistories }: ComponentProp) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // @ts-ignore
  const isShowBalance = useSelector((state) => state.settings.isShowBalance);
  const { assetRegistry } = useSelector((state) => state.assetRegistry);
  const { currencyData, priceMap } = useSelector((state) => state.price);
  const { currentAccount, isAllAccount } = useSelector((state) => state.accountState);
  const [stateAutoClaimManage, setAutoStateClaimManage] = useState<PalletNominationPoolsClaimPermission | undefined>((compound as NominationYieldPositionInfo).claimPermissionStatus);
  const [, setEarnStorage] = useLocalStorage(EARN_TRANSACTION, DEFAULT_EARN_PARAMS);
  const [, setUnStakeStorage] = useLocalStorage(UN_STAKE_TRANSACTION, DEFAULT_UN_STAKE_PARAMS);
  const { activeModal, inactiveModal } = useContext(ModalContext);
  const { token } = useTheme() as Theme;
  const onPreCheck = usePreCheckAction(currentAccount?.address, true, earningMessageWatchOnly);
  const { alertProps, closeAlert, openAlert } = useAlert(alertModalId);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const notify = useNotification();

  const inputAsset = useMemo(() => {
    const inputSlug = poolInfo.metadata.inputAsset;

    return assetRegistry[inputSlug];
  }, [assetRegistry, poolInfo.metadata.inputAsset]);

  const price = useMemo(() => priceMap[inputAsset?.priceId || ''] || 0, [inputAsset?.priceId, priceMap]);
  const exchangeRate = useMemo(() => {
    let rate = 1;

    if ('derivativeToken' in compound) {
      const _item = compound as SpecialYieldPositionInfo;
      const _poolInfo = poolInfo as SpecialYieldPoolInfo;
      const balanceToken = _item.balanceToken;

      if (_poolInfo) {
        const asset = _poolInfo.statistic?.assetEarning.find((i) => i.slug === balanceToken);

        rate = asset?.exchangeRate || 1;
      }
    }

    return rate;
  }, [compound, poolInfo]);

  const activeStake = useMemo(() => {
    return new BigN(compound.activeStake).multipliedBy(exchangeRate);
  }, [compound.activeStake, exchangeRate]);

  // @ts-ignore
  const convertActiveStake = useMemo(() => {
    return activeStake.div(BN_TEN.pow(inputAsset?.decimals || 0)).multipliedBy(price);
  }, [activeStake, inputAsset?.decimals, price]);

  // @ts-ignore
  const filteredRewardHistories = useMemo(() => {
    if (!isAllAccount && currentAccount) {
      return rewardHistories.filter((item) => item.slug === poolInfo.slug && item.address === currentAccount.address);
    } else {
      return [];
    }
  }, [currentAccount, isAllAccount, poolInfo.slug, rewardHistories]);

  const isActiveStakeZero = useMemo(() => {
    return BN_ZERO.eq(activeStake);
  }, [activeStake]);

  const transactionFromValue = useMemo(() => {
    return currentAccount?.address ? isAccountAll(currentAccount.address) ? '' : currentAccount.address : '';
  }, [currentAccount?.address]);

  const transactionChainValue = useMemo(() => {
    return compound.chain || poolInfo.chain || '';
  }, [compound.chain, poolInfo.chain]);

  const onLeavePool = useCallback(() => {
    if (isActiveStakeZero) {
      openAlert({
        title: t('Unstaking not available'),
        type: NotificationType.ERROR,
        content: t("You don't have any staked funds left to unstake. Check withdrawal status (how long left until the unstaking period ends) by checking the Withdraw info. Keep in mind that you need to withdraw manually."),
        okButton: {
          text: t('OK'),
          onClick: closeAlert
        }
      });

      return;
    }

    setUnStakeStorage({
      ...DEFAULT_UN_STAKE_PARAMS,
      slug: poolInfo.slug,
      chain: transactionChainValue,
      from: transactionFromValue
    });
    navigate('/transaction/unstake');
  }, [closeAlert, isActiveStakeZero, navigate, poolInfo.slug, setUnStakeStorage, openAlert, t, transactionChainValue, transactionFromValue]);

  const onEarnMore = useCallback(() => {
    setEarnStorage({
      ...DEFAULT_EARN_PARAMS,
      slug: compound.slug,
      chain: transactionChainValue,
      from: transactionFromValue,
      claimPermissionless: stateAutoClaimManage
    });
    navigate('/transaction/earn');
  }, [compound.slug, navigate, setEarnStorage, transactionChainValue, transactionFromValue, stateAutoClaimManage]);

  const onBack = useCallback(() => {
    navigate('/home/earning', { state: {
      view: EarningEntryView.POSITIONS
    } as EarningEntryParam });
  }, [navigate]);

  const openManageAutoClaimModal = useCallback(() => {
    !isLoading && activeModal(manageAutoClaimModalId);
  }, [activeModal, isLoading]);

  const handleEnableAutoCompoundSwitch = useCallback(() => {
    const { address, slug } = compound;

    if (stateAutoClaimManage !== PalletNominationPoolsClaimPermission.PERMISSIONED) {
      setIsLoading(true);
      yieldSubmitSetClaimPermissions({
        address,
        slug,
        claimPermissionless: PalletNominationPoolsClaimPermission.PERMISSIONED
      })
        .then((rs) => {
          if (rs.errors.length > 0) {
            rs.errors[0].message !== messageRejectAccount && notify({
              type: 'error',
              message: rs.errors[0].message
            });

            setIsLoading(false);
          }
        })
        .catch((error) => {
          console.error(error);
        });
    } else {
      setIsLoading(true);
      activeModal(manageAutoClaimModalId);
    }
  }, [compound, notify, stateAutoClaimManage, activeModal]);

  const handleSetModeAutoCompound = useCallback((mode: PalletNominationPoolsClaimPermission) => {
    return new Promise((resolve) => {
      setIsLoading(true);
      const { address, slug } = compound;

      yieldSubmitSetClaimPermissions({
        address,
        slug,
        claimPermissionless: mode
      })
        .then((rs) => {
          if (rs.errors.length > 0) {
            rs.errors[0].message !== messageRejectAccount && notify({
              type: 'error',
              message: rs.errors[0].message
            });
            setIsLoading(false);
          }

          resolve(mode);
        })
        .catch((error) => {
          console.error(error);
        })
        .finally(() => inactiveModal(manageAutoClaimModalId));
    });
  }, [compound, notify, inactiveModal]);

  const subHeaderButtons: ButtonProps[] = useMemo(() => {
    return [
      {
        icon: (
          <Icon
            phosphorIcon={Plus}
            size='sm'
            type='phosphor'
          />
        ),
        onClick: onEarnMore
      }
    ];
  }, [onEarnMore]);

  useEffect(() => {
    setAutoStateClaimManage((compound as NominationYieldPositionInfo).claimPermissionStatus);
  }, [compound]);

  useEffect(() => {
    setIsLoading(false);
  }, [stateAutoClaimManage]);

  return (
    <>
      <Layout.Base
        className={'__screen-container'}
        onBack={onBack}
        showBackButton={true}
        showSubHeader={true}
        subHeaderBackground={'transparent'}
        subHeaderCenter={false}
        subHeaderIcons={subHeaderButtons}
        subHeaderPaddingVertical={true}
        title={t<string>('Earning position details')}
      >
        <div className={'__active-stake-info-area'}>
          <div className={'__active-stake-title'}>{t('Active stake')}</div>
          <Number
            className={'__active-stake-value'}
            decimal={inputAsset?.decimals || 0}
            hide={!isShowBalance}
            subFloatNumber={true}
            suffix={inputAsset?.symbol}
            value={activeStake}
          />

          <Number
            className={'__active-stake-converted-value'}
            decimal={0}
            hide={!isShowBalance}
            prefix={(currencyData.isPrefix && currencyData.symbol) || ''}
            suffix={(!currencyData.isPrefix && currencyData.symbol) || ''}
            value={convertActiveStake}
          />
        </div>
        { !!stateAutoClaimManage && (
          <Web3Block
            className={'__auto-claim-box'}
            middleItem={
              <div className={'__auto-claim-group'}>
                <div className={'__auto-claim-state-item'}>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <BackgroundIcon
                      backgroundColor={token['gold-6']}
                      iconColor={'white'}
                      phosphorIcon={getBannerButtonIcon('Coins')}
                      size='sm'
                      weight='fill'
                    />
                    <div className={'__left-item-label'}>{t('Auto claim rewards')}</div>
                    <Tooltip
                      placement={'top'}
                      title={t('Your rewards will be automatically claimed to your wallet')}
                    >
                      <div>
                        <Icon
                          className={'__left-item-info-icon'}
                          customSize={'16px'}
                          phosphorIcon={Info}
                          weight={'fill'}
                        />
                      </div>
                    </Tooltip>
                  </div>
                  <Switch
                    checked={stateAutoClaimManage !== PalletNominationPoolsClaimPermission.PERMISSIONED}
                    className={'__auto-claim-switch-state'}
                    loading={isLoading}
                    onClick={onPreCheck(handleEnableAutoCompoundSwitch, ExtrinsicType.STAKING_SET_CLAIM_PERMISSIONLESS)}
                  />
                </div>
                {
                  stateAutoClaimManage !== PalletNominationPoolsClaimPermission.PERMISSIONED && (
                    <div className={'__auto-claim-state-item'}>
                      <Tag
                        bgType={'default'}
                        className={CN('__status-auto-claim', SET_CLAIM_PERMISSIONS[stateAutoClaimManage].bgColor)}
                        color={SET_CLAIM_PERMISSIONS[stateAutoClaimManage].bgColor}
                        icon={(
                          <Icon
                            phosphorIcon={getBannerButtonIcon(SET_CLAIM_PERMISSIONS[stateAutoClaimManage].icon)}
                            weight={'fill'}
                          />
                        )}
                      >
                        {t(SET_CLAIM_PERMISSIONS[stateAutoClaimManage].title)}
                      </Tag>
                      <div
                        className={CN('__manage-auto-compound-box', {
                          '-disabled': isLoading
                        })}
                        onClick={openManageAutoClaimModal}
                      >
                        <Icon
                          customSize={'20px'}
                          iconColor={token['gray-5']}
                          phosphorIcon={GearSix}
                        />
                        <span className={'__manage-auto-compound-label'}>
                          {t('Manage auto claim')}
                        </span>
                      </div>
                    </div>
                  )}
              </div>}
          />
        )}

        <RewardInfoPart
          className={'__reward-info-part'}
          closeAlert={closeAlert}
          compound={compound}
          inputAsset={inputAsset}
          isShowBalance={isShowBalance}
          openAlert={openAlert}
          rewardHistories={filteredRewardHistories}
          transactionChainValue={transactionChainValue}
          transactionFromValue={transactionFromValue}
        />

        <div className={'__transaction-buttons'}>
          <Button
            block={true}
            disabled={isLoading}
            icon={(
              <Icon
                phosphorIcon={MinusCircle}
                weight='fill'
              />
            )}
            onClick={onLeavePool}
            schema='secondary'
          >
            {poolInfo.type === YieldPoolType.LENDING ? t('Withdraw') : t('Unstake')}
          </Button>

          <Button
            block={true}
            disabled={isLoading}
            icon={(
              <Icon
                phosphorIcon={PlusCircle}
                weight='fill'
              />
            )}
            onClick={onEarnMore}
            schema='secondary'
          >
            {poolInfo.type === YieldPoolType.LENDING ? t('Supply more') : t('Stake more')}
          </Button>
        </div>

        <WithdrawInfoPart
          className={'__withdraw-info-part'}
          inputAsset={inputAsset}
          poolInfo={poolInfo}
          transactionChainValue={transactionChainValue}
          transactionFromValue={transactionFromValue}
          unstakings={compound.unstakings}
        />

        <AccountAndNominationInfoPart
          className={'__account-and-nomination-info-part'}
          compound={compound}
          inputAsset={inputAsset}
          list={list}
          poolInfo={poolInfo}
        />

        <EarningInfoPart
          className={'__earning-info-part'}
          inputAsset={inputAsset}
          poolInfo={poolInfo}
        />
      </Layout.Base>

      {
        !!alertProps && (
          <AlertModal
            modalId={alertModalId}
            {...alertProps}
          />
        )
      }

      {stateAutoClaimManage && <EarningManageClaimPermissions
        blockWatchOnly={true}
        currentMode={stateAutoClaimManage}
        onSubmit={handleSetModeAutoCompound}
        setIsLoading={setIsLoading}
        slug={compound.slug}
      />}
    </>
  );
}

const ComponentGate = () => {
  const locationState = useLocation().state as EarningPositionDetailParam;
  const navigate = useNavigate();
  const [earningSlug] = useState<string>(locationState?.earningSlug || '');

  const { poolInfoMap, rewardHistories } = useSelector((state) => state.earning);
  const data = useYieldPositionDetail(earningSlug);
  const poolInfo = poolInfoMap[earningSlug];

  useEffect(() => {
    if (!data.compound || !poolInfo) {
      navigate('/home/earning', { state: {
        view: EarningEntryView.POSITIONS
      } as EarningEntryParam });
    }
  }, [data.compound, poolInfo, navigate]);

  if (!data.compound || !poolInfo) {
    return null;
  }

  return (
    <Component
      compound={data.compound}
      list={data.list}
      poolInfo={poolInfo}
      rewardHistories={rewardHistories}
    />
  );
};

const Wrapper = ({ className }: Props) => {
  const dataContext = useContext(DataContext);

  return (
    <PageWrapper
      className={CN(className)}
      resolve={dataContext.awaitStores(['earning', 'price', 'balance'])}
    >
      <ComponentGate />
    </PageWrapper>
  );
};

const EarningPositionDetail = styled(Wrapper)<Props>(({ theme: { token } }: Props) => ({
  '.ant-sw-screen-layout-body': {
    paddingLeft: token.padding,
    paddingRight: token.padding,
    paddingBottom: token.padding
  },

  '.__reward-info-part, .__withdraw-info-part, .__account-and-nomination-info-part, .__transaction-buttons': {
    marginBottom: token.marginSM
  },

  '.__active-stake-info-area': {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: token.sizeXXS,
    paddingTop: 24,
    paddingBottom: 24
  },

  '.__active-stake-title': {
    fontSize: token.sizeSM,
    lineHeight: token.lineHeightSM,
    color: token.colorTextLight4
  },

  '.__active-stake-value': {
    fontSize: token.fontSizeHeading2,
    lineHeight: token.lineHeightHeading2,
    fontWeight: token.headingFontWeight,
    color: token.colorTextLight1,

    '.ant-number-integer': {
      color: 'inherit !important',
      fontSize: 'inherit !important',
      fontWeight: 'inherit !important',
      lineHeight: 'inherit'
    },

    '.ant-number-decimal, .ant-number-suffix': {
      color: `${token.colorTextLight3} !important`,
      fontSize: `${token.fontSizeHeading3}px !important`,
      fontWeight: 'inherit !important',
      lineHeight: token.lineHeightHeading3
    }
  },

  '.__active-stake-converted-value': {
    fontSize: token.fontSizeLG,
    lineHeight: token.lineHeightLG,
    fontWeight: token.bodyFontWeight,
    color: token.colorTextLight4,

    '.ant-typography': {
      color: 'inherit !important',
      fontSize: 'inherit !important',
      fontWeight: 'inherit !important',
      lineHeight: 'inherit'
    }
  },

  '.__transaction-buttons': {
    display: 'flex',
    gap: token.sizeSM
  },

  '.__auto-claim-box': {
    backgroundColor: token.colorBgSecondary,
    borderRadius: 8,
    justifyContent: 'space-between',
    transition: 'height .3s ease-in-out'
  },

  '.ant-web3-block': {
    padding: token.paddingSM,
    transition: 'height .5s ease-in-out',
    marginBottom: token.marginSM
  },

  '.__auto-claim-state-item': {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative'
  },

  '.__auto-claim-group': {
    display: 'flex',
    flexDirection: 'column',
    gap: token.sizeXXS
  },

  '.__manage-auto-compound-box': {
    display: 'flex',
    gap: token.sizeXS,
    alignItems: 'center',
    height: 40,
    transition: 'opacity .3s ease-in-out',

    '&:hover': {
      opacity: 0.8
    },

    '&.-disabled': {
      cursor: 'not-allowed'
    },

    '&.-disabled:hover': {
      opacity: 1
    }
  },

  '.__manage-auto-compound-label': {
    fontWeight: token.fontWeightStrong,
    lineHeight: token.lineHeightHeading6,
    color: token.colorTextLight3
  },

  '.__left-item-label': {
    fontWeight: token.fontWeightStrong,
    fontSize: token.fontSizeHeading6,
    lineHeight: token.lineHeightHeading6,
    marginLeft: token.marginXS
  },

  '.-row-last': {
    marginBottom: -token.marginSM
  },

  '.__status-auto-claim.lime': {
    color: token['lime-7']
  },

  '.__status-auto-claim.blue': {
    color: token['blue-7']
  },

  '.__auto-claim-switch-state': {
    right: 0,
    position: 'absolute'
  }
}));

export default EarningPositionDetail;
