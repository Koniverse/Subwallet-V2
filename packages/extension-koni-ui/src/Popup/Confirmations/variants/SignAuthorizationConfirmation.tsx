// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ConfirmationsQueueItem, SignAuthorizeRequest } from '@subwallet/extension-base/background/KoniTypes';
import { AccountItemWithProxyAvatar, ConfirmationGeneralInfo } from '@subwallet/extension-koni-ui/components';
import { useGetAccountByAddress, useTranslation } from '@subwallet/extension-koni-ui/hooks';
import { EvmSignatureSupportType, ThemeProps } from '@subwallet/extension-koni-ui/types';
import CN from 'classnames';
import React from 'react';
import styled from 'styled-components';

import { EvmSignArea } from '../parts';

interface Props extends ThemeProps {
  type: EvmSignatureSupportType
  request: ConfirmationsQueueItem<SignAuthorizeRequest>
}

const Component: React.FC<Props> = (props: Props) => {
  const { className, request, type } = props;
  const { id, payload } = request;
  const { t } = useTranslation();
  const { address } = payload;
  const account = useGetAccountByAddress(address);
  // const onClickDetail = useOpenDetailModal();

  return (
    <>
      <div className={CN('confirmation-content', className)}>
        <ConfirmationGeneralInfo request={request} />
        <div className='title'>
          {t('Signature required')}
        </div>
        <div className='description'>
          {t('You are approving a request with the following account')}
        </div>
        <AccountItemWithProxyAvatar
          account={account}
          accountAddress={address}
          className='account-item'
          isSelected={true}
        />
        {/* {(!errors || errors.length === 0) && <div> */}
        {/*   <Button */}
        {/*     icon={<ViewDetailIcon />} */}
        {/*     onClick={onClickDetail} */}
        {/*     size='xs' */}
        {/*     type='ghost' */}
        {/*   > */}
        {/*     {t('View details')} */}
        {/*   </Button> */}
        {/* </div> */}
        {/* } */}
      </div>
      <EvmSignArea
        id={id}
        payload={request}
        type={type}
      />
      {/* {(!errors || errors.length === 0) && <BaseDetailModal */}
      {/*   title={t('Message details')} */}
      {/* > */}
      {/*   <EvmMessageDetail payload={request.payload} /> */}
      {/* </BaseDetailModal>} */}
    </>
  );
};

const SignAuthorizationConfirmation = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {

  };
});

export default SignAuthorizationConfirmation;
