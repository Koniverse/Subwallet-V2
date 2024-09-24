// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { BasicInputWrapper } from '@subwallet/extension-koni-ui/components/Field/Base';
import { useSelectModalInputHelper, useTranslation } from '@subwallet/extension-koni-ui/hooks';
import { AccountAddressItemType, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { toShort } from '@subwallet/extension-koni-ui/utils';
import { Field, Icon, InputRef, ModalContext } from '@subwallet/react-ui';
import CN from 'classnames';
import { CaretDown } from 'phosphor-react';
import React, { ForwardedRef, forwardRef, useCallback, useContext, useMemo } from 'react';
import styled from 'styled-components';

import { AccountSelectorModal } from '../Modal';

interface Props extends ThemeProps, BasicInputWrapper {
  items: AccountAddressItemType[];
  labelStyle?: 'horizontal' | 'vertical';
}

const Component = (props: Props, ref: ForwardedRef<InputRef>): React.ReactElement<Props> => {
  const { className = '', disabled, id = 'account-selector', items
    , label, labelStyle, placeholder
    , readOnly, statusHelp, tooltip, value } = props;

  const { t } = useTranslation();
  const { onSelect } = useSelectModalInputHelper(props, ref);
  const { activeModal, inactiveModal } = useContext(ModalContext);

  const onOpenModal = useCallback(() => {
    if (disabled || readOnly) {
      return;
    }

    activeModal(id);
  }, [activeModal, disabled, id, readOnly]);

  const onCancelModal = useCallback(() => {
    inactiveModal(id);
  }, [id, inactiveModal]);

  const onSelectItem = useCallback((item: AccountAddressItemType) => {
    onSelect(item.address);
    onCancelModal();
  }, [onCancelModal, onSelect]);

  const selectedItem = useMemo(() => {
    if (!value) {
      return undefined;
    }

    return items.find((i) => i.address === value);
  }, [items, value]);

  const fieldContent = useMemo(() => {
    if (!selectedItem) {
      return null;
    }

    return (
      <div className={'__selected-item'}>
        <div className={'__selected-item-name common-text'}>
          {selectedItem.accountName}
        </div>

        <div className={'__selected-item-address common-text'}>
          &nbsp;({toShort(selectedItem.address, 4, 5)})
        </div>
      </div>
    );
  }, [selectedItem]);

  const fieldSuffix = useMemo(() => {
    return (
      <Icon
        className={'__caret-icon'}
        customSize={'20px'}
        phosphorIcon={CaretDown}
      />
    );
  }, []);

  return (
    <>
      <div
        className={className}
        onClick={onOpenModal}
      >
        <Field
          className={CN({
            '-label-horizontal': labelStyle === 'horizontal',
            'is-selectable': !(disabled || readOnly),
            'is-disabled': disabled,
            'is-readonly': readOnly
          })}
          content={fieldContent}
          label={label}
          placeholder={placeholder || t('Select account')}
          statusHelp={statusHelp}
          suffix={fieldSuffix}
          tooltip={tooltip}
        />
      </div>
      <AccountSelectorModal
        items={items}
        modalId={id}
        onCancel={onCancelModal}
        onSelectItem={onSelectItem}
        selectedValue={value}
      />
    </>
  );
};

const AccountAddressSelector = styled(forwardRef(Component))<Props>(({ theme: { token } }: Props) => {
  return ({
    '.__selected-item': {
      display: 'flex',
      fontWeight: token.headingFontWeight,
      color: token.colorTextLight1,
      whiteSpace: 'nowrap',
      overflow: 'hidden'
    },

    '.ant-field-container .ant-field-content.ant-field-content.ant-field-content': {
      color: token.colorTextLight2
    },

    '.__selected-item-name': {
      textOverflow: 'ellipsis',
      fontWeight: token.headingFontWeight,
      overflow: 'hidden'
    },

    '.__selected-item-address': {
      color: token.colorTextLight4
    },

    '.__caret-icon': {
      minWidth: 40,
      display: 'flex',
      justifyContent: 'center',
      marginRight: -10
    }
  });
});

export default AccountAddressSelector;
