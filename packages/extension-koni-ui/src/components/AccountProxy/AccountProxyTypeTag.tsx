// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AccountProxyType } from '@subwallet/extension-base/types';
import useTranslation from '@subwallet/extension-koni-ui/hooks/common/useTranslation';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import { Icon, Tag } from '@subwallet/react-ui';
import { SwIconProps } from '@subwallet/react-ui/es/icon';
import { TagProps } from '@subwallet/react-ui/es/tag';
import CN from 'classnames';
import { CirclesThreePlus, Eye, GitCommit, Needle, QrCode, Question, Strategy, Swatches } from 'phosphor-react';
import React, { useMemo } from 'react';
import styled from 'styled-components';

interface Props extends ThemeProps {
  type: AccountProxyType;
}

type TagType = {
  color?: TagProps['color'];
  label: string;
  icon: {
    size?: SwIconProps['size'];
    customSize?: SwIconProps['customSize'];
    phosphorIcon?: SwIconProps['phosphorIcon']
    customIcon?: SwIconProps['customIcon'];
    weight?: SwIconProps['weight'];
  }
}

const Component: React.FC<Props> = ({ className, type }: Props) => {
  const { t } = useTranslation();
  const tag = useMemo<TagType>(() => {
    const result: TagType = {
      color: 'default',
      label: '',
      icon: {
        weight: 'fill'
      }
    };

    if (type === AccountProxyType.ALL_ACCOUNT) {
      result.label = t('All account');
      result.icon.phosphorIcon = CirclesThreePlus;
    } else if (type === AccountProxyType.SOLO) {
      result.color = 'blue';
      result.label = t('Solo account');
      result.icon.phosphorIcon = GitCommit;
    } else if (type === AccountProxyType.UNIFIED) {
      result.color = 'success';
      result.label = t('Unified account');
      result.icon.phosphorIcon = Strategy;
    } else if (type === AccountProxyType.QR) {
      result.label = t('QR signer account');
      result.icon.phosphorIcon = QrCode;
    } else if (type === AccountProxyType.LEDGER) {
      result.label = t('Ledger account');
      result.icon.phosphorIcon = Swatches;
    } else if (type === AccountProxyType.READ_ONLY) {
      result.label = t('Watch-only account');
      result.icon.phosphorIcon = Eye;
    } else if (type === AccountProxyType.INJECTED) {
      result.label = t('injected account');
      result.icon.phosphorIcon = Needle;
    } else if (type === AccountProxyType.UNKNOWN) {
      result.label = t('Unknown account');
      result.icon.phosphorIcon = Question;
    }

    return result;
  }, [t, type]);

  return (
    <Tag
      bgType={'default'}
      className={CN(className)}
      color={tag.color}
      icon={(
        <Icon
          {...tag.icon}
        />
      )}
    >
      {tag.label}
    </Tag>
  );
};

const AccountProxyTypeTag = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {
    '&.ant-tag-default': {
      position: 'relative',
      color: token['gray-6'],

      '&:before': {
        content: '""',
        backgroundColor: token['gray-10'],
        width: '100%',
        height: '100%',
        position: 'absolute',
        borderRadius: 8,
        top: 0,
        left: 0,
        zIndex: 1,
        opacity: 0.1
      }
    },

    '&.ant-tag-blue': {
      color: token['blue-8'],

      '&:before': {
        backgroundColor: token.blue,
        opacity: 0.1
      }
    }
  };
});

export default AccountProxyTypeTag;
