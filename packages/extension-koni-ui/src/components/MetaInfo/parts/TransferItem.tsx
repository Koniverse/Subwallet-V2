// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountProxyAvatar } from '@subwallet/extension-koni-ui/components';
import ChainItem from '@subwallet/extension-koni-ui/components/MetaInfo/parts/ChainItem';
import { useSelector } from '@subwallet/extension-koni-ui/hooks';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import { ChainInfo } from '@subwallet/extension-koni-ui/types/chain';
import { findAccountByAddress, toShort } from '@subwallet/extension-koni-ui/utils';
import { Logo } from '@subwallet/react-ui';
import CN from 'classnames';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import AccountItem from './AccountItem';
import { InfoItemBase } from './types';

export interface TransferInfoItem extends Omit<InfoItemBase, 'label'> {
  senderAddress: string;
  senderName?: string;
  senderLabel?: string;
  recipientAddress: string;
  recipientName?: string;
  recipientLabel?: string;
  originChain?: ChainInfo;
  destinationChain?: ChainInfo;
}

const Component: React.FC<TransferInfoItem> = (props: TransferInfoItem) => {
  const { className,
    destinationChain,
    originChain,
    recipientAddress,
    recipientLabel,
    recipientName,
    senderAddress,
    senderLabel,
    senderName,
    valueColorSchema = 'default' } = props;

  const { t } = useTranslation();
  const accounts = useSelector((state: RootState) => state.accountState.accounts);

  const nameClassModifier = useMemo(() => {
    if (!!senderName && recipientName === undefined) {
      return '__recipient';
    } else if (recipientName && senderName === undefined) {
      return '__sender';
    }

    return '';
  }, [recipientName, senderName]);

  const genAccountBlock = (address: string, name?: string) => {
    const account = findAccountByAddress(accounts, address);
    const shortAddress = toShort(address);

    if (name) {
      return (
        <div className={`__account-item __value -is-wrapper -schema-${valueColorSchema} ${nameClassModifier}`}>
          <div className={'__account-item-wrapper'}>
            <div className={'__account-item-name-wrapper'}>
              <AccountProxyAvatar
                className={'__account-avatar'}
                size={24}
                value={account?.proxyId || address}
              />
              <div className={'__account-item-name'}>{name}</div>
            </div>
            <div className={'__account-item-address'}>{shortAddress}</div>
          </div>
        </div>
      );
    }

    return (
      <div className={`__account-item __value -is-wrapper -schema-${valueColorSchema} ${nameClassModifier}`}>
        <AccountProxyAvatar
          className={'__account-avatar'}
          size={24}
          value={account?.proxyId || address}
        />
        <div className={'__account-name ml-xs'}>
          <div className={'__account-item-address'}>{shortAddress}</div>
        </div>
      </div>
    );
  };

  const genChainBlock = (chain: ChainInfo) => {
    return (
      <div className={`__chain-item __value -is-wrapper -schema-${valueColorSchema}`}>
        <Logo
          className={'__chain-logo'}
          network={chain.slug}
          size={24}
        />

        <div className={'__chain-name ml-xs'}>
          {chain.name}
        </div>
      </div>
    );
  };

  if (!recipientAddress) {
    return (
      <>
        <AccountItem
          address={senderAddress}
          chainSlug={originChain?.slug}
          label={senderLabel || t('Sender')}
          name={senderName}
        />

        {!!originChain && !!destinationChain && originChain.slug === destinationChain.slug
          ? (
            <ChainItem
              chain={originChain.slug}
              label={t('Network')}
            />
          )
          : (
            <>
              {!!originChain && (
                <ChainItem
                  chain={originChain.slug}
                  label={t('Origin Chain')}
                />
              )}

              {!!destinationChain && (
                <ChainItem
                  chain={destinationChain.slug}
                  label={t('Destination Chain')}
                />
              )}
            </>
          )}

      </>
    );
  }

  return (
    <div className={CN(className, '__row -type-transfer')}>
      <div className={'__col __label-col'}>
        <div className={'__label'}>{senderLabel || t('Sender')}</div>

        {genAccountBlock(senderAddress, senderName)}
        {!!originChain && originChain.slug !== destinationChain?.slug && genChainBlock(originChain)}
      </div>
      <div className={'__col __value-col'}>
        <div className={'__label'}>{recipientLabel || t('Recipient')}</div>

        {genAccountBlock(recipientAddress, recipientName)}
        {!!destinationChain && destinationChain.slug !== originChain?.slug && genChainBlock(destinationChain)}
      </div>
    </div>
  );
};

const TransferItem = styled(Component)<TransferInfoItem>(({ theme: { token } }: TransferInfoItem) => {
  return {
    display: 'flex',
    gap: 4,
    '.__sender, .__recipient': {
      minHeight: 44
    },
    '.__sender.__sender.__value': {
      alignItems: 'flex-start'
    },
    '.__recipient.__recipient.__value': {
      alignItems: 'flex-start'
    },
    '.__chain-name': {
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },
    '.__account-item-wrapper': {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      '.__account-item-name-wrapper': {
        display: 'flex',
        gap: 8,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      },
      '.__account-item-name': {
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      },
      '.__account-item-address': {
        paddingLeft: 32,
        fontSize: token.fontSizeSM,
        lineHeight: token.lineHeightSM
      }
    }
  };
});

export default TransferItem;
