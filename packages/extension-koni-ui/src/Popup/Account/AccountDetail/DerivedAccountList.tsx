// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { GeneralEmptyList } from '@subwallet/extension-koni-ui/components';
import { useTranslation } from '@subwallet/extension-koni-ui/hooks';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import { SwList } from '@subwallet/react-ui';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';

type Props = ThemeProps;

type ItemType = string;

function Component ({ className }: Props) {
  const { t } = useTranslation();
  const items: ItemType[] = useMemo(() => {
    return [];
  }, []);

  const renderItem = useCallback(
    (item: ItemType) => {
      return (
        <div key={item}>

        </div>
      );
    },
    []
  );

  const emptyList = useCallback(() => {
    return <GeneralEmptyList />;
  }, []);

  const searchFunction = useCallback(
    (item: ItemType, searchText: string) => {
      return true;
    },
    []
  );

  return (
    <SwList.Section
      className={className}
      enableSearchInput
      list={items}
      renderItem={renderItem}
      renderWhenEmpty={emptyList}
      searchFunction={searchFunction}
      searchMinCharactersCount={2}
      searchPlaceholder={t<string>('Enter network name')}
      showActionBtn
    />
  );
}

export const DerivedAccountList = styled(Component)<Props>(({ theme: { token } }: Props) => ({

}));
