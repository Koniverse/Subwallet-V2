// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import { NominationYieldPositionInfo, PalletNominationPoolsClaimPermission } from '@subwallet/extension-base/types';
import { detectTranslate } from '@subwallet/extension-base/utils';
import { InstructionItem } from '@subwallet/extension-koni-ui/components';
import { EARNING_MANAGE_AUTO_CLAIM_MODAL, SET_CLAIM_PERMISSIONS } from '@subwallet/extension-koni-ui/constants';
import { usePreCheckAction, useSelector } from '@subwallet/extension-koni-ui/hooks';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import { Theme, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { getBannerButtonIcon } from '@subwallet/extension-koni-ui/utils';
import { BackgroundIcon, Button, Icon, ModalContext, SwModal } from '@subwallet/react-ui';
import CN from 'classnames';
import { CheckCircle, XCircle } from 'phosphor-react';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled, { useTheme } from 'styled-components';

interface Props extends ThemeProps {
  onSubmit: (state: PalletNominationPoolsClaimPermission) => Promise<any>;
  currentMode: PalletNominationPoolsClaimPermission;
  blockWatchOnly?: boolean;
  setIsLoading?: (isLoading: boolean) => void;
  slug: string;
}

const SET_CLAIM_PERMISSIONS_LIST = Object.entries(SET_CLAIM_PERMISSIONS);
const earningMessageWatchOnly = detectTranslate('You are using a {{accountTitle}}. Earning is not supported with this account type');
const claimPermissionsModalId = EARNING_MANAGE_AUTO_CLAIM_MODAL;

const Component: React.FC<Props> = (props: Props) => {
  const { className } = props;
  const { currentAccount } = useSelector((state: RootState) => state.accountState);
  const { checkActive, inactiveModal } = useContext(ModalContext);
  const onPreCheck = usePreCheckAction(currentAccount?.address, true, earningMessageWatchOnly);
  const { t } = useTranslation();
  const { token } = useTheme() as Theme;
  const positionInfoSet = useSelector((state) => state.earning.yieldPositions);
  const [modeAutoClaim, setModeAutoClaim] = useState<PalletNominationPoolsClaimPermission>(props.currentMode || PalletNominationPoolsClaimPermission.PERMISSIONLESS_COMPOUND);
  const [isLoading, setIsLoading] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);

  useEffect(() => {
    const positionInfo = positionInfoSet.find((position) => (position as NominationYieldPositionInfo)?.claimPermissionStatus && props.slug === position.slug && position.address === currentAccount?.address);

    const statusAutoClaim = (positionInfo as NominationYieldPositionInfo)?.claimPermissionStatus || PalletNominationPoolsClaimPermission.PERMISSIONED;

    setIsDisabled(modeAutoClaim === statusAutoClaim);
  }, [currentAccount?.address, modeAutoClaim, positionInfoSet, props.slug]);

  const titleModeItem = useCallback((mode: PalletNominationPoolsClaimPermission) => {
    if (mode === PalletNominationPoolsClaimPermission.PERMISSIONED) {
      return <></>;
    }

    return (
      <div className={'__mode-item-header'}>
        <div className={'__mode-item-title'}>
          {SET_CLAIM_PERMISSIONS[mode].title}
        </div>
        { modeAutoClaim === mode && <Icon
          iconColor={token.colorSuccess}
          phosphorIcon={CheckCircle}
          size='sm'
          type='phosphor'
          weight='fill'
        />}
      </div>
    );
  }, [modeAutoClaim, token.colorSuccess]);

  const onCancelModal = useCallback(() => {
    setModeAutoClaim(props.currentMode);
    inactiveModal(claimPermissionsModalId);
    props.setIsLoading && props.setIsLoading(false);
  }, [inactiveModal, props]);

  const onSelectAutoClaimMode = useCallback((key: string) => {
    return () => {
      !isLoading && setModeAutoClaim(key as PalletNominationPoolsClaimPermission);
    };
  }, [isLoading]);

  const onSubmitAutoClaimMode = useCallback(() => {
    setIsLoading(true);

    if (modeAutoClaim !== props.currentMode) {
      props.onSubmit(modeAutoClaim).then(() => {
        setIsLoading(false);
      }).catch((error) => {
        setModeAutoClaim(props.currentMode);
        console.log(error);
      })
        .finally(() => inactiveModal(claimPermissionsModalId));
    } else {
      setIsLoading(false);
      inactiveModal(claimPermissionsModalId);
    }
  }, [inactiveModal, modeAutoClaim, props]);

  useEffect(() => {
    setModeAutoClaim(props.currentMode === PalletNominationPoolsClaimPermission.PERMISSIONED ? PalletNominationPoolsClaimPermission.PERMISSIONLESS_COMPOUND : props.currentMode);
  }, [checkActive, props.currentMode]);

  const footerModal = useMemo(() => {
    return (
      <div className={'__footer-button-group'}>
        <Button
          block={true}
          disabled={isLoading}
          icon={
            <Icon
              phosphorIcon={XCircle}
              weight={'fill'}
            />
          }
          onClick={onCancelModal}
          schema={'secondary'}
        >
          {t('Cancel')}
        </Button>
        <Button
          block={true}
          disabled={isDisabled}
          icon={
            <Icon
              phosphorIcon={CheckCircle}
              weight={'fill'}
            />
          }
          loading={isLoading}
          onClick={props.blockWatchOnly ? onPreCheck(onSubmitAutoClaimMode, ExtrinsicType.STAKING_SET_CLAIM_PERMISSIONLESS) : onSubmitAutoClaimMode}
        >
          {t('Submit')}
        </Button>
      </div>
    );
  }, [isLoading, onCancelModal, t, isDisabled, props.blockWatchOnly, onPreCheck, onSubmitAutoClaimMode]);

  return (
    <SwModal
      className={CN(className)}
      closable={true}
      footer={footerModal}
      id={claimPermissionsModalId}
      maskClosable={false}
      onCancel={onCancelModal}
      title={t('Manage auto claim permission')}
    >
      <div className={'__permission-claim-subtitle'}>
        {t('Select auto compound or auto withdraw to set auto claim permission for your nomination pool staking rewards')}
      </div>
      <div className={'__permission-claim-mode-group'}>
        {!!SET_CLAIM_PERMISSIONS_LIST.length && SET_CLAIM_PERMISSIONS_LIST.map(([key, _props], index) => {
          return (
            <InstructionItem
              className={CN('__permission-claim-mode', {
                '-isSelected': key === modeAutoClaim
              })}
              description={(
                <div dangerouslySetInnerHTML={{ __html: (t<string>(_props.description)) }}></div>
              )}
              iconInstruction={
                <BackgroundIcon
                  backgroundColor={_props.iconColor}
                  iconColor={'white'}
                  phosphorIcon={getBannerButtonIcon(_props.icon)}
                  size='sm'
                  weight='fill'
                />
              }
              key={`${_props.icon}-${index}`}
              onClick={onSelectAutoClaimMode(key)}
              title={titleModeItem(key as PalletNominationPoolsClaimPermission)}
            />
          );
        })}
      </div>
    </SwModal>
  );
};

const EarningManageClaimPermissions = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {

    '.__permission-claim-subtitle': {
      fontSize: token.fontSizeSM,
      lineHeight: token.lineHeightSM,
      color: token.colorTextLight4,
      marginBottom: token.margin
    },

    '.__permission-claim-mode-group': {
      display: 'flex',
      flexDirection: 'column',
      gap: token.sizeSM
    },

    '.ant-sw-modal-footer': {
      borderTop: 'none',
      marginTop: -token.margin
    },

    '.__footer-button-group': {
      display: 'flex'
    },

    '.ant-sw-header-center-part': {
      width: 'fit-content'
    },

    '.__mode-item-header': {
      display: 'flex',
      justifyContent: 'space-between'
    },

    '.__permission-claim-mode': {
      cursor: 'pointer',
      border: '1px solid transparent',
      transition: 'border ease-in-out'
    },

    '.__permission-claim-mode.-isSelected': {
      borderColor: token.colorSuccess
    },

    '.__item-description': {
      fontSize: token.fontSizeSM,
      lineHeight: token.lineHeightSM
    }
  };
});

export default EarningManageClaimPermissions;
