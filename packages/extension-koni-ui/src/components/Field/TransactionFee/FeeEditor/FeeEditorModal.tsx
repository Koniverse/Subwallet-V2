// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { BN_ZERO } from '@subwallet/extension-base/utils';
import { BasicInputEvent, RadioGroup } from '@subwallet/extension-koni-ui/components';
import { FeeOption, FeeOptionItem } from '@subwallet/extension-koni-ui/components/Field/TransactionFee/FeeEditor/FeeOptionItem';
import { FormCallbacks, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { Button, Form, Input, ModalContext, Number, SwModal } from '@subwallet/react-ui';
import { Rule } from '@subwallet/react-ui/es/form';
import BigN from 'bignumber.js';
import CN from 'classnames';
import React, { useCallback, useContext, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

type Props = ThemeProps & {
  modalId: string;
  onSelectOption: () => void
};

enum ViewMode {
  RECOMMENDED = 'recommended',
  CUSTOM = 'custom'
}

interface ViewOption {
  label: string;
  value: ViewMode;
}

interface FormProps {
  customValue: string;
}

const OPTIONS: FeeOption[] = [
  'slow',
  'average',
  'fast'
];

type FeeInfo = {
  time: number;
  value: number;
};

const feeInfoMap: Record<FeeOption, FeeInfo> = {
  slow: {
    time: 60 * 1000 * 30,
    value: 0.02
  },
  average: {
    time: 60 * 1000 * 15,
    value: 0.2
  },
  fast: {
    time: 60 * 1000 * 5,
    value: 1
  }
};

const Component = ({ className, modalId, onSelectOption }: Props): React.ReactElement<Props> => {
  const { t } = useTranslation();
  const { inactiveModal } = useContext(ModalContext);
  const [currentViewMode, setViewMode] = useState<ViewMode>(ViewMode.RECOMMENDED);

  const [form] = Form.useForm<FormProps>();

  const formDefault = useMemo((): FormProps => {
    return {
      customValue: ''
    };
  }, []);

  const viewOptions = useMemo((): ViewOption[] => {
    return [
      {
        label: t('Recommended'),
        value: ViewMode.RECOMMENDED
      },
      {
        label: t('Custom'),
        value: ViewMode.CUSTOM
      }
    ];
  }, [t]);

  const onChaneViewMode = useCallback((event: BasicInputEvent) => {
    setViewMode(event.target.value as ViewMode);
  }, []);

  const onCancelModal = useCallback(() => {
    inactiveModal(modalId);
  }, [inactiveModal, modalId]);

  const _onSelectOption = useCallback(() => {
    return () => {
      onSelectOption();
      inactiveModal(modalId);
    };
  }, [inactiveModal, modalId, onSelectOption]);

  const renderOption = (option: FeeOption) => {
    return (
      <FeeOptionItem
        className={'__fee-option-item'}
        feeValueInfo={{
          value: feeInfoMap[option].value,
          decimals: 0,
          symbol: 'KSM'
        }}
        key={option}
        onClick={_onSelectOption()}
        time={feeInfoMap[option].time}
        type={option}
      />
    );
  };

  const customValueValidator = useCallback((rule: Rule, value: string): Promise<void> => {
    return Promise.resolve();
  }, []);

  const convertedCustomValue = useMemo<BigN>(() => {
    return BN_ZERO;
  }, []);

  const onSubmitCustomValue: FormCallbacks<FormProps>['onFinish'] = useCallback(({ customValue }: FormProps) => {
    inactiveModal(modalId);
    onSelectOption();
  }, [inactiveModal, modalId, onSelectOption]);

  return (
    <SwModal
      className={CN(className)}
      footer={(
        <Button
          block={true}
          className={'__approve-button'}
        >
          Approve
        </Button>
      )}
      id={modalId}
      onCancel={onCancelModal}
      title={t('Choose fee')}
    >
      <div className={'__switcher-box'}>
        <RadioGroup
          onChange={onChaneViewMode}
          optionType='button'
          options={viewOptions}
          value={currentViewMode}
        />
      </div>

      <div className={'__fee-token-selector-area'}>
        <div className='__fee-token-selector-label'>
          {t('Fee paid in')}
        </div>
      </div>

      {
        currentViewMode === ViewMode.RECOMMENDED && (
          <div className={'__fee-options-panel'}>
            {OPTIONS.map(renderOption)}
          </div>
        )
      }

      {
        currentViewMode === ViewMode.CUSTOM && (
          <div className={'__custom-fee-panel'}>
            <Form
              form={form}
              initialValues={formDefault}
              onFinish={onSubmitCustomValue}
            >
              <div className={'__custom-value-field-wrapper'}>
                <Number
                  className={'__converted-custom-value'}
                  decimal={0}
                  prefix={'~ $'}
                  value={convertedCustomValue}
                />
                <Form.Item
                  className={'__custom-value-field'}
                  name={'customValue'}
                  rules={[
                    {
                      validator: customValueValidator
                    }
                  ]}
                  statusHelpAsTooltip={true}
                >
                  <Input
                    label={'TOKEN'}
                    placeholder={'Enter fee value'}
                    type={'number'}
                  />
                </Form.Item>
              </div>
            </Form>
          </div>
        )
      }
    </SwModal>
  );
};

export const FeeEditorModal = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return ({
    '.ant-sw-modal-body': {
      paddingBottom: 0
    },

    '.ant-sw-modal-footer': {
      borderTop: 0
    },

    '.__switcher-box': {
      marginBottom: token.margin
    },

    '.__fee-token-selector-area': {
      padding: token.paddingSM,
      backgroundColor: token.colorBgSecondary,
      borderRadius: token.borderRadiusLG,
      marginBottom: token.marginXS
    },

    '.__fee-token-selector-label': {
      fontSize: token.fontSize,
      lineHeight: token.lineHeight,
      color: token.colorTextLight4
    },

    '.__fee-option-item + .__fee-option-item': {
      marginTop: token.marginXS
    },

    // custom fee panel

    '.__custom-value-field-wrapper': {
      position: 'relative'
    },

    '.__converted-custom-value': {
      position: 'absolute',
      zIndex: 1,
      right: token.sizeSM,
      top: token.sizeXS,
      fontSize: token.fontSize,
      lineHeight: token.lineHeight,
      color: token.colorTextLight4,

      '.ant-typography': {
        color: 'inherit !important',
        fontSize: 'inherit !important',
        fontWeight: 'inherit !important',
        lineHeight: 'inherit'
      }
    },

    '.__custom-value-field .ant-input-label': {
      top: 5,
      paddingBottom: 2
    },

    '.ant-form-item-has-error': {
      marginBottom: 11
    },

    '.ant-form-item': {
      marginBottom: 0
    },

    '.-status-error .ant-input-suffix': {
      display: 'none'
    }
  });
});
