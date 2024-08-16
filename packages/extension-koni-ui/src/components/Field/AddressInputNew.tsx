// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { BaseSelectRef } from 'rc-select';

import { useForwardFieldRef, useOpenQrScanner, useTranslation } from '@subwallet/extension-koni-ui/hooks';
import { ScannerResult, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { toShort } from '@subwallet/extension-koni-ui/utils';
import { AutoComplete, Button, Icon, Input, ModalContext, SwQrScanner } from '@subwallet/react-ui';
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

type OptionType = ResponseOption & {
  value: string,
  label: React.ReactNode
}

interface Props extends BasicInputWrapper, ThemeProps {
  chainSlug: string;
  inputResolver: (input: string, chainSlug: string) => Promise<ResponseOption[]>;
  showAddressBook?: boolean;
  showScanner?: boolean;
  labelStyle?: 'horizontal' | 'vertical';
}

const defaultScannerModalId = 'input-account-address-scanner-modal';

// todo:
//  - Update fetch option logic for auto complete
//  - Update Address book
//  - When on blur, must show name + address
//  - Rename to AddressInput, after this component is done

function Component (props: Props, ref: ForwardedRef<BaseSelectRef>): React.ReactElement<Props> {
  const { chainSlug, className = '', disabled, id, inputResolver,
    label, labelStyle, onBlur, onChange, onFocus, placeholder, readOnly,
    showAddressBook, showScanner, status, statusHelp, value } = props;
  const { t } = useTranslation();

  const { inactiveModal } = useContext(ModalContext);

  // @ts-ignore
  const [options, setOptions] = useState<OptionType[]>([]);
  const [inputValue, setInputValue] = useState<string | undefined>(value);

  const scannerId = useMemo(() => id ? `${id}-scanner-modal` : defaultScannerModalId, [id]);

  const fieldRef = useForwardFieldRef<BaseSelectRef>(ref);
  const [scanError, setScanError] = useState('');

  const parseAndChangeValue = useCallback((value: string) => {
    const val = value.trim();

    onChange && onChange({ target: { value: val } });
  }, [onChange]);

  const onSelectAutoComplete = useCallback((data: string) => {
    setInputValue(data);
  }, []);

  const onChangeInputValue = useCallback((data: string) => {
    setInputValue(data);
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

  const currentOption = useMemo(() => {
    if (!inputValue || !options.length) {
      return undefined;
    }

    return options.find((o) => o.value === inputValue);
  }, [inputValue, options]);

  useEffect(() => {
    let sync = true;

    if (!inputValue || !chainSlug) {
      setOptions([]);
    } else {
      inputResolver(inputValue, chainSlug).then((res) => {
        if (!sync) {
          return;
        }

        setOptions(res.map((item) => ({
          ...item,
          value: item.address,
          label: item.name
        })));
      }).catch(console.error);
    }

    return () => {
      sync = false;
    };
  }, [chainSlug, inputResolver, inputValue]);

  return (
    <>
      <AutoComplete
        className={className}
        onBlur={_onBlur}
        onChange={onChangeInputValue}
        onFocus={onFocus}
        onSelect={onSelectAutoComplete}
        options={options}
        ref={fieldRef}
        value={inputValue}
      >
        <Input
          className={CN({
            '-label-horizontal': labelStyle === 'horizontal',
            '-has-overlay': !!currentOption
          })}
          disabled={disabled}
          id={id}
          label={label || t('Account address')}
          placeholder={placeholder || t('Please type or paste an address')}
          prefix={
            <>
              {
                currentOption && (
                  <div className={'__overlay'}>
                    <div className={CN('__name common-text')}>
                      {currentOption.name}
                    </div>
                    <div className={'__address common-text'}>
                       &nbsp;({toShort(currentOption.address, 4, 4)})
                    </div>
                  </div>
                )
              }
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
    '.__overlay': {
      position: 'absolute',
      top: 2,
      left: 2,
      bottom: 2,
      right: 118,
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      paddingLeft: token.paddingSM,
      whiteSpace: 'nowrap',
      fontWeight: token.headingFontWeight
    },

    '.__name': {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      color: token.colorTextLight1,
      flexShrink: 1
    },

    '.__address': {
      color: token.colorTextLight4
    },

    '.ant-input': {
      color: token.colorTextLight1,
      fontWeight: token.headingFontWeight
    },

    '.ant-input-prefix': {
      pointerEvents: 'none',
      paddingRight: 0
    },

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

      '.__overlay': {
        left: 0,
        paddingLeft: 0
      }
    },

    '.ant-input-container.-has-overlay': {
      '.ant-input': {
        opacity: 0
      },

      '&:focus-within': {
        '.ant-input': {
          opacity: 1
        },

        '.__overlay': {
          opacity: 0
        }
      }
    }
  });
});
