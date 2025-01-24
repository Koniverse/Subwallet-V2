// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { BaseSelectRef } from 'rc-select';

import { NotificationType } from '@subwallet/extension-base/background/KoniTypes';
import { _isPureSubstrateChain } from '@subwallet/extension-base/services/chain-service/utils';
import { AnalyzeAddress, AnalyzedGroup, ResponseInputAccountSubscribe } from '@subwallet/extension-base/types';
import { _reformatAddressWithChain } from '@subwallet/extension-base/utils';
import { AddressSelectorItem } from '@subwallet/extension-koni-ui/components';
import { ADDRESS_INPUT_AUTO_FORMAT_VALUE } from '@subwallet/extension-koni-ui/constants';
import { WalletModalContext } from '@subwallet/extension-koni-ui/contexts/WalletModalContextProvider';
import { useForwardFieldRef, useOpenQrScanner, useTranslation } from '@subwallet/extension-koni-ui/hooks';
import useGetChainInfo from '@subwallet/extension-koni-ui/hooks/screen/common/useFetchChainInfo';
import { cancelSubscription, saveRecentAccount, subscribeAccountsInputAddress } from '@subwallet/extension-koni-ui/messaging';
import { ScannerResult, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { toShort } from '@subwallet/extension-koni-ui/utils';
import { isAddress } from '@subwallet/keyring';
import { AutoComplete, Button, Icon, Input, ModalContext, Switch, SwQrScanner } from '@subwallet/react-ui';
import CN from 'classnames';
import { Book, CheckCircle, MagicWand, Scan, XCircle } from 'phosphor-react';
import React, { ForwardedRef, forwardRef, SyntheticEvent, useCallback, useContext, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useLocalStorage } from 'usehooks-ts';

import { AddressBookModal } from '../Modal';
import { QrScannerErrorNotice } from '../Qr';
import { BasicInputWrapper } from './Base';

type AutoCompleteItem = {
  graftedValue: string;
  origin: AnalyzeAddress;
  label: React.ReactNode;
}

type AutoCompleteGroupItem = {
  label: React.ReactNode;
  options: AutoCompleteItem[];
}

interface Props extends BasicInputWrapper, ThemeProps {
  chainSlug?: string;
  showAddressBook?: boolean;
  showScanner?: boolean;
  labelStyle?: 'horizontal' | 'vertical';
  saveAddress?: boolean;
  dropdownHeight?: number;
}

export interface AddressInputRef extends BaseSelectRef {
  setInputValue: React.Dispatch<React.SetStateAction<string | undefined>>;
  setSelectedOption: React.Dispatch<React.SetStateAction<AnalyzeAddress | undefined>>;
}

const defaultScannerModalId = 'input-account-address-scanner-modal';
const defaultAddressBookModalId = 'input-account-address-book-modal';

const autoCompleteFieldNames = { label: 'label', value: 'graftedValue' };

function getGraftedValue (responseOption: AnalyzeAddress) {
  return `${responseOption.formatedAddress}|-|${responseOption.displayName || responseOption.proxyId || ''}|-|${responseOption.analyzedGroup}`;
}

function getInputValueFromGraftedValue (graftedValue: string) {
  return graftedValue.split('|-|')[0];
}

// todo:
//  - Rename to AddressInput, after this component is done

function Component (props: Props, ref: ForwardedRef<AddressInputRef>): React.ReactElement<Props> {
  const { chainSlug, className = '', disabled, dropdownHeight = 240,
    id, label, labelStyle, onBlur, onChange, onFocus, placeholder, readOnly,
    saveAddress, showAddressBook, showScanner, status, statusHelp, value } = props;
  const { t } = useTranslation();

  const { activeModal, inactiveModal } = useContext(ModalContext);
  const { alertModal } = useContext(WalletModalContext);

  const [responseOptions, setResponseOptions] = useState<AnalyzeAddress[]>([]);
  const [selectedOption, setSelectedOption] = useState<AnalyzeAddress | undefined>();
  const [openDropdownManually, setOpenDropdownManually] = useState<boolean | undefined>();
  const [inputValue, setInputValue] = useState<string | undefined>(value);
  const [autoFormatValue, setAutoFormatValue] = useLocalStorage(ADDRESS_INPUT_AUTO_FORMAT_VALUE, false);

  const chainInfo = useGetChainInfo(chainSlug || '');

  const scannerId = useMemo(() => id ? `${id}-scanner-modal` : defaultScannerModalId, [id]);
  const addressBookId = useMemo(() => id ? `${id}-address-book-modal` : defaultAddressBookModalId, [id]);

  const fieldRef = useForwardFieldRef<AddressInputRef>(ref);
  const fieldRefCurrent = fieldRef.current;
  const [scanError, setScanError] = useState('');

  const parseAndChangeValue = useCallback((_value: string) => {
    const val = _value.trim();

    onChange && onChange({ target: { value: val } });

    if (isAddress(val) && saveAddress) {
      saveRecentAccount(val, chainSlug).catch(console.error);
    }
  }, [chainSlug, onChange, saveAddress]);

  const onChangeInputValue = useCallback((_value: string) => {
    setInputValue(_value);
    setSelectedOption(undefined);
    setOpenDropdownManually(undefined);
  }, []);

  const isShowAdvancedAddressDetection = useMemo(() => {
    return !!chainInfo && _isPureSubstrateChain(chainInfo);
  }, [chainInfo]);

  const _onBlur: React.FocusEventHandler<HTMLInputElement> = useCallback((event) => {
    const _inputValue = inputValue || '';

    if (isShowAdvancedAddressDetection && autoFormatValue && isAddress(_inputValue) && chainInfo && !selectedOption) {
      const reformatedInputValue = _reformatAddressWithChain(_inputValue, chainInfo);

      parseAndChangeValue(reformatedInputValue);

      setSelectedOption({
        address: _inputValue,
        formatedAddress: reformatedInputValue,
        analyzedGroup: AnalyzedGroup.RECENT,
        displayName: toShort(_inputValue, 3, 4)
      });

      setInputValue(reformatedInputValue);
    } else {
      parseAndChangeValue(_inputValue);
    }

    setOpenDropdownManually(undefined);

    onBlur?.(event);
  }, [autoFormatValue, chainInfo, inputValue, isShowAdvancedAddressDetection, onBlur, parseAndChangeValue, selectedOption]);

  // autoComplete
  // "item: unknown" is hotfix for typescript error of AutoComplete
  const onSelectAutoComplete = useCallback((graftedValue: string, item: unknown) => {
    setInputValue(getInputValueFromGraftedValue(graftedValue));

    const _selectedOption = (item as AutoCompleteItem)?.origin;

    if (_selectedOption) {
      setSelectedOption(_selectedOption);
    }

    setTimeout(() => {
      fieldRefCurrent?.blur();
    }, 300);
  }, [fieldRefCurrent]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape' || event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();

      fieldRefCurrent?.blur();
    }
  }, [fieldRefCurrent]);

  const autoCompleteOptions = useMemo<AutoCompleteGroupItem[]>(() => {
    if (!responseOptions.length) {
      return [];
    }

    const result: AutoCompleteGroupItem[] = [];
    const walletItems: AutoCompleteItem[] = [];
    const contactItems: AutoCompleteItem[] = [];
    const domainItems: AutoCompleteItem[] = [];
    const recentItems: AutoCompleteItem[] = [];

    const genAutoCompleteItem = (responseOption: AnalyzeAddress): AutoCompleteItem => {
      return {
        graftedValue: getGraftedValue(responseOption),
        label: (
          <AddressSelectorItem
            address={responseOption.formatedAddress}
            avatarValue={responseOption.proxyId}
            name={responseOption.displayName}
          />
        ),
        origin: responseOption
      };
    };

    const genAutoCompleteGroupItem = (label: string, options: AutoCompleteItem[]) => {
      return {
        label,
        options
      };
    };

    responseOptions.forEach((ro) => {
      if (ro.analyzedGroup === AnalyzedGroup.WALLET) {
        walletItems.push(genAutoCompleteItem(ro));
      } else if (ro.analyzedGroup === AnalyzedGroup.CONTACT) {
        contactItems.push(genAutoCompleteItem(ro));
      } else if (ro.analyzedGroup === AnalyzedGroup.DOMAIN) {
        domainItems.push(genAutoCompleteItem(ro));
      } else if (ro.analyzedGroup === AnalyzedGroup.RECENT) {
        recentItems.push(genAutoCompleteItem(ro));
      }
    });

    if (walletItems.length) {
      result.push(genAutoCompleteGroupItem(t('My wallet'), walletItems));
    }

    if (contactItems.length) {
      result.push(genAutoCompleteGroupItem(t('My contact'), contactItems));
    }

    if (domainItems.length) {
      result.push(genAutoCompleteGroupItem(t('Domain name'), domainItems));
    }

    if (recentItems.length) {
      result.push(genAutoCompleteGroupItem(t('Recent'), recentItems));
    }

    return result;
  }, [responseOptions, t]);

  const onSwitchAdvancedAddressDetection = useCallback((checked: boolean) => {
    if (checked) {
      alertModal.open({
        closable: false,
        title: t('Advanced address conversion'),
        type: NotificationType.WARNING,
        content: t('This feature auto-converts your recipient address into the correct format for your chosen destination network. Wrong destination network will result in loss of funds. Only enable if you’re an advanced user'),
        cancelButton: {
          text: t('Cancel'),
          icon: XCircle,
          iconWeight: 'fill',
          onClick: () => {
            // setOpenDropdownManually(undefined);
            alertModal.close();
          },
          schema: 'secondary'
        },
        okButton: {
          text: t('Enable'),
          icon: CheckCircle,
          iconWeight: 'fill',
          onClick: () => {
            // setOpenDropdownManually(undefined);
            setAutoFormatValue(checked);

            alertModal.close();
          },
          schema: 'primary'
        }
      });
    } else {
      setAutoFormatValue(checked);
    }
  }, [alertModal, setAutoFormatValue, t]);

  const dropdownRender = useCallback((menu: React.ReactElement): React.ReactElement => {
    return (
      <>
        {
          isShowAdvancedAddressDetection && (
            <div className={'__advanced-address-detection'}>
              <Icon
                className={'__advanced-address-detection-icon'}
                customSize={'16px'}
                phosphorIcon={MagicWand}
                weight={'fill'}
              />

              <div className={'__advanced-address-detection-label'}>
                {t('Advanced address detection')}
              </div>

              <Switch
                checked={autoFormatValue}
                className={'__advanced-address-detection-switch'}
                onClick={onSwitchAdvancedAddressDetection}
              />
            </div>
          )
        }

        {menu}
      </>
    );
  }, [autoFormatValue, isShowAdvancedAddressDetection, onSwitchAdvancedAddressDetection, t]);

  // address book

  const onOpenAddressBook = useCallback((e?: SyntheticEvent) => {
    e && e.stopPropagation();
    activeModal(addressBookId);
  }, [activeModal, addressBookId]);

  const onSelectAddressBook = useCallback((_value: string, item: AnalyzeAddress) => {
    fieldRefCurrent?.focus();
    onChangeInputValue(_value);
    setSelectedOption(item);
    setTimeout(() => {
      fieldRefCurrent?.blur();
    }, 300);
  }, [onChangeInputValue, fieldRefCurrent]);

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
    setScanError('');
    inactiveModal(scannerId);
    setSelectedOption(undefined);
    onChangeInputValue(result.text);

    // timeout to make the output value is updated
    setTimeout(() => {
      fieldRefCurrent?.focus();
      setOpenDropdownManually(true);
    }, 300);
  }, [onChangeInputValue, fieldRefCurrent, inactiveModal, scannerId]);

  const onCloseScan = useCallback(() => {
    fieldRefCurrent?.focus();
    setScanError('');
    fieldRefCurrent?.blur();
  }, [fieldRefCurrent]);

  const dropdownListHeight = useMemo(() => {
    return isShowAdvancedAddressDetection ? dropdownHeight - 60 : (dropdownHeight - 24);
  }, [dropdownHeight, isShowAdvancedAddressDetection]);

  useImperativeHandle(ref, () => {
    if (fieldRefCurrent) {
      return {
        ...fieldRefCurrent,
        setInputValue,
        setSelectedOption
      };
    }

    return {
      setInputValue,
      setSelectedOption,
      focus: () => {
        //
      },
      blur: () => {
        //
      },
      scrollTo: () => {
        //
      }
    };
  }, [fieldRefCurrent]);

  useEffect(() => {
    let sync = true;
    let id: string | undefined;

    if (!inputValue || inputValue.length < 2 || !chainSlug) {
      setResponseOptions([]);
    } else {
      const handler = (data: ResponseInputAccountSubscribe) => {
        id = data.id;

        if (sync) {
          setResponseOptions(data.options);
        }
      };

      subscribeAccountsInputAddress({
        data: inputValue,
        chain: chainSlug
      }, handler).then(handler).catch(console.error);
    }

    return () => {
      sync = false;

      if (id) {
        cancelSubscription(id).catch(console.log);
      }
    };
  }, [chainSlug, inputValue]);

  return (
    <>
      <div className={CN(className, '-input-container')}>
        <AutoComplete
          disabled={disabled}
          dropdownRender={dropdownRender}
          fieldNames={autoCompleteFieldNames}
          listHeight={dropdownListHeight}
          onBlur={_onBlur}
          onChange={onChangeInputValue}
          onFocus={onFocus}
          onKeyDown={handleKeyDown}
          onSelect={onSelectAutoComplete}
          open={openDropdownManually}
          options={autoCompleteOptions}
          popupClassName={CN(className, '-dropdown-container')}
          ref={fieldRef}
          value={inputValue}
        >
          <Input
            className={CN({
              '-label-horizontal': labelStyle === 'horizontal',
              '-has-overlay': !!selectedOption
            })}
            disabled={disabled}
            id={id}
            label={label || t('Account address')}
            placeholder={placeholder || t('Please type or paste an address')}
            prefix={
              <>
                {
                  selectedOption && (
                    <div className={'__overlay'}>
                      {
                        !!selectedOption.displayName && (
                          <div className={'__name common-text'}>
                            {selectedOption.displayName}
                          </div>
                        )
                      }

                      <div className={'__address common-text'}>
                        {
                          selectedOption.displayName
                            ? (
                              <>
                                &nbsp;({toShort(selectedOption.formatedAddress, 4, 5)})
                              </>
                            )
                            : toShort(selectedOption.formatedAddress, 9, 10)
                        }
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
                  <div className={'__button-placeholder'}></div>
                )}
                {
                  showScanner &&
                  (
                    <div className={'__button-placeholder'}></div>
                  )}
              </>
            )}
            value={value}
          />
        </AutoComplete>

        <div className={'__action-buttons'}>
          {
            showAddressBook &&
            (
              <Button
                disabled={disabled}
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
        </div>
      </div>

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

      {
        showAddressBook &&
        (
          <AddressBookModal
            chainSlug={chainSlug}
            id={addressBookId}
            onSelect={onSelectAddressBook}
            value={value}
          />
        )
      }
    </>
  );
}

export const AddressInputNew = styled(forwardRef(Component))<Props>(({ theme: { token } }: Props) => {
  return ({
    '&.-input-container': {
      position: 'relative',

      '.__action-buttons': {
        position: 'absolute',
        bottom: 0,
        right: 0,
        display: 'flex',
        zIndex: 2,
        paddingRight: token.paddingXXS,
        paddingBottom: token.paddingXXS
      },

      '.__button-placeholder': {
        minWidth: 40
      },

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
    },

    '&.-dropdown-container': {
      paddingTop: token.padding,
      paddingLeft: token.paddingSM,
      paddingRight: token.paddingSM,
      paddingBottom: token.paddingXS,
      borderRadius: token.borderRadiusLG,
      backgroundColor: token.colorBgSecondary,

      '.__advanced-address-detection': {
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        marginBottom: token.marginSM
      },

      '.__advanced-address-detection-icon': {
        minWidth: 24,
        height: 24,
        marginRight: token.marginXXS,
        justifyContent: 'center'
      },

      '.__advanced-address-detection-label': {
        fontSize: token.fontSize,
        lineHeight: token.lineHeight,
        fontWeight: token.bodyFontWeight,
        color: token.colorTextLight4,
        textOverflow: 'ellipsis',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        marginRight: token.marginXS,
        flex: 1
      },

      '.__advanced-address-detection-switch': {
        height: 24,
        minWidth: 40,
        borderRadius: 40,

        '.ant-switch-handle': {
          width: 20,
          height: 20,

          '&:before': {
            borderRadius: 20
          }
        },

        '.ant-switch-inner': {
          display: 'none'
        },

        '&.ant-switch-checked .ant-switch-handle': {
          insetInlineStart: 'calc(100% - 22px)'
        }
      },

      '.rc-virtual-list': {
        marginRight: -token.marginSM,
        marginLeft: -token.marginSM
      },

      '.rc-virtual-list-scrollbar': {
        opacity: 0
      },

      '.rc-virtual-list-holder-inner': {
        paddingLeft: token.paddingSM,
        paddingRight: token.paddingSM
      },

      '.ant-select-item-group': {
        padding: 0,
        fontSize: 11,
        lineHeight: '20px',
        color: token.colorTextLight2,
        textTransform: 'uppercase',
        minHeight: 0,
        paddingBottom: token.paddingXXS
      },

      '.ant-select-item-option-active.ant-select-item-option-active': {
        backgroundColor: 'transparent'
      },

      '.ant-select-item-option': {
        padding: 0,
        borderRadius: token.borderRadiusLG
      },

      '.ant-select-item-option + .ant-select-item-option': {
        paddingTop: token.paddingXXS
      },

      '.ant-select-item-option + .ant-select-item-group': {
        paddingTop: token.paddingXS
      }
    }
  });
});
