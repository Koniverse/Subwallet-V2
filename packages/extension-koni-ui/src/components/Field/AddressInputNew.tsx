// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { BaseSelectRef } from 'rc-select';

import { useForwardFieldRef, useOpenQrScanner, useTranslation } from '@subwallet/extension-koni-ui/hooks';
import { ScannerResult, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { AutoComplete, AutoCompleteProps, Button, Icon, Input, ModalContext, SwQrScanner } from '@subwallet/react-ui';
import CN from 'classnames';
import { Book, Scan } from 'phosphor-react';
import React, { ForwardedRef, forwardRef, SyntheticEvent, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import { QrScannerErrorNotice } from '../Qr';
import { BasicInputWrapper } from './Base';

type ResponseOption = {
  address: string;
  name: string;
}

interface Props extends BasicInputWrapper, ThemeProps {
  inputResolver?: (input: string, chainSlug: string) => Promise<ResponseOption[]>;
  showAddressBook?: boolean;
  showScanner?: boolean;
  labelStyle?: 'horizontal' | 'vertical';
}

const defaultScannerModalId = 'input-account-address-scanner-modal';

const enableMockOptions = false;

// todo:
//  - Update fetch option logic for auto complete
//  - Update Address book
//  - When on blur, must show name + address
//  - Rename to AddressInput, after this component is done

function Component (props: Props, ref: ForwardedRef<BaseSelectRef>): React.ReactElement<Props> {
  const { className = '', disabled, id, label, labelStyle,
    onBlur, onChange, onFocus, placeholder, readOnly, showAddressBook, showScanner,
    status, statusHelp, value } = props;
  const { t } = useTranslation();

  const { inactiveModal } = useContext(ModalContext);

  // @ts-ignore
  const [options, setOptions] = useState<AutoCompleteProps['options']>([]);
  const [inputValue, setInputValue] = useState<string | undefined>();

  const scannerId = useMemo(() => id ? `${id}-scanner-modal` : defaultScannerModalId, [id]);

  const fieldRef = useForwardFieldRef<BaseSelectRef>(ref);
  const [scanError, setScanError] = useState('');

  const parseAndChangeValue = useCallback((value: string) => {
    const val = value.trim();

    onChange && onChange({ target: { value: val } });
  }, [onChange]);

  const onSelectAutoComplete = useCallback((data: string) => {
    parseAndChangeValue(data);
  }, [parseAndChangeValue]);

  const onChangeInputValue = useCallback((data: string) => {
    setInputValue(data);
  }, []);

  const onSearchAutoComplete = useCallback((data: string) => {
    setOptions(() => {
      if (!enableMockOptions) {
        return [];
      }

      // todo: this is mock data, will update the real one later

      return ['op1', 'op2', 'op3'].map((option) => ({
        label: `${data} - ${option}`,
        value: `${data}||${option}`
      }));
    });
  }, []);

  const _onBlur: React.FocusEventHandler<HTMLInputElement> = useCallback((event) => {
    parseAndChangeValue(inputValue || '');

    onBlur?.(event);
  }, [inputValue, onBlur, parseAndChangeValue]);

  // address book

  const onOpenAddressBook = useCallback((e?: SyntheticEvent) => {
    e && e.stopPropagation();
  }, []);

  // scanner

  const openScanner = useOpenQrScanner(scannerId);

  const onOpenScanner = useCallback((e?: SyntheticEvent) => {
    e && e.stopPropagation();
    openScanner();
  }, [openScanner]);

  const onScanError = useCallback((error: string) => {
    setScanError(error);
  }, []);

  const onSuccessScan = useCallback((result: ScannerResult) => {
    fieldRef?.current?.focus();
    setScanError('');
    inactiveModal(scannerId);
    setInputValue(result.text);

    // timeout to make the output value is updated
    setTimeout(() => {
      fieldRef?.current?.blur();
    }, 300);
  }, [fieldRef, inactiveModal, scannerId]);

  const onCloseScan = useCallback(() => {
    fieldRef?.current?.focus();
    setScanError('');
    fieldRef?.current?.blur();
  }, [fieldRef]);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  return (
    <>
      <AutoComplete
        className={className}
        onBlur={_onBlur}
        onChange={onChangeInputValue}
        onFocus={onFocus}
        onSearch={onSearchAutoComplete}
        onSelect={onSelectAutoComplete}
        options={options}
        ref={fieldRef}
        value={inputValue}
      >
        <Input
          className={CN({
            '-label-horizontal': labelStyle === 'horizontal'
          })}
          disabled={disabled}
          id={id}
          label={label || t('Account address')}
          placeholder={placeholder || t('Please type or paste an address')}
          prefix={
            <>
              {/* { */}
              {/*  value && ( */}
              {/*    <div className={'__overlay'}> */}

              {/*    </div> */}
              {/*  ) */}
              {/* } */}
            </>
          }
          readOnly={readOnly}
          status={status}
          statusHelp={statusHelp}
          suffix={(
            <>
              {
                showAddressBook &&
              (
                <Button
                  icon={(
                    <Icon
                      phosphorIcon={Book}
                      size='sm'
                    />
                  )}
                  onClick={onOpenAddressBook}
                  size='xs'
                  type='ghost'
                />
              )}
              {
                showScanner &&
              (
                <Button
                  disabled={disabled}
                  icon={(
                    <Icon
                      phosphorIcon={Scan}
                      size='sm'
                    />
                  )}
                  onClick={onOpenScanner}
                  size='xs'
                  type='ghost'
                />
              )}
            </>
          )}
          value={value}
        />
      </AutoComplete>

      {
        showScanner &&
        (
          <SwQrScanner
            className={className}
            id={scannerId}
            isError={!!scanError}
            onClose={onCloseScan}
            onError={onScanError}
            onSuccess={onSuccessScan}
            overlay={scanError && <QrScannerErrorNotice message={scanError} />}
          />
        )
      }
    </>
  );
}

export const AddressInputNew = styled(forwardRef(Component))<Props>(({ theme: { token } }: Props) => {
  return ({
    '.ant-input-container.-label-horizontal': {
      display: 'flex',
      flexDirection: 'row',
      gap: token.sizeXXS,
      alignItems: 'center',

      '.ant-input-label': {
        paddingRight: 0,
        top: 0,
        paddingTop: 0,
        minWidth: 46
      },

      '.ant-input-wrapper': {
        flex: 1
      },

      '.ant-input-affix-wrapper': {
        paddingLeft: 0
      },

      '.ant-input-prefix': {
        paddingRight: 0
      }
    },

    '.__overlay': {
      position: 'absolute',
      backgroundColor: token.colorBgSecondary,
      top: 0,
      left: 2,
      bottom: 2,
      right: 2,
      borderRadius: token.borderRadiusLG,
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      paddingLeft: 40,
      paddingRight: 84,
      whiteSpace: 'nowrap'
    },

    '.__name': {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      color: token.colorTextLight1,

      '&.limit-width': {
        maxWidth: 136
      }
    },

    '.__address': {
      paddingLeft: token.sizeXXS
    },

    '.ant-input-prefix': {
      pointerEvents: 'none'
    },

    '&.-status-error': {
      '.__overlay': {
        pointerEvents: 'none',
        opacity: 0
      }
    },

    // Not support firefox
    '&:has(input:focus)': {
      '.__overlay': {
        pointerEvents: 'none',
        opacity: 0
      }
    },

    // Support firefox
    '.ant-input-affix-wrapper-focused': {
      '.__overlay': {
        pointerEvents: 'none',
        opacity: 0
      }
    }
  });
});
