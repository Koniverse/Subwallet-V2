// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import Search from '@subwallet/extension-web-ui/components/Search';
import { ThemeProps } from '@subwallet/extension-web-ui/types';
import { Icon } from '@subwallet/react-ui';
import CN from 'classnames';
import { FadersHorizontal } from 'phosphor-react';
import React from 'react';
import styled from 'styled-components';

interface Props extends ThemeProps{
  onClickFilter: VoidFunction;
  onSearch: (value: string) => void;
  inputPlaceholder: string;
  searchValue: string;
  extraActionNode?: React.ReactNode; // todo: later
}

function Component ({ className, extraActionNode, inputPlaceholder, onClickFilter, onSearch, searchValue }: Props): React.ReactElement<Props> {
  return (
    <div className={CN(className)}>
      <Search
        actionBtnIcon={(
          <Icon
            phosphorIcon={FadersHorizontal}
            size='sm'
          />
        )}
        extraButton={(<>{extraActionNode}</>)}
        onClickActionBtn={onClickFilter}
        onSearch={onSearch}
        placeholder={inputPlaceholder}
        searchValue={searchValue}
        showActionBtn
        showExtraButton={true}
      />
    </div>
  );
}

export const Toolbar = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: token.sizeXS
  };
});
