// Copyright 2019-2022 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ThemeNames } from '@subwallet/extension-base/background/KoniTypes';
import defaultImagePlaceholder from '@subwallet/extension-web-ui/assets/default-image-placeholder.png';
import { IconMap } from '@subwallet/extension-web-ui/assets/logo';
import subWalletLogo from '@subwallet/extension-web-ui/assets/sub-wallet-logo.svg';
import SwLogosMap from '@subwallet/extension-web-ui/assets/subwallet';
import { theme as SwReactUI } from '@subwallet/react-ui';
import { ThemeConfig as _ThemeConfig, Web3LogoMap } from '@subwallet/react-ui/es/config-provider/context';
import { AliasToken as _AliasToken, GlobalToken as _GlobalToken } from '@subwallet/react-ui/es/theme/interface';
import logoMap from '@subwallet/react-ui/es/theme/themes/logoMap';
import seedToken from '@subwallet/react-ui/es/theme/themes/seed';

export type ThemeConfig = _ThemeConfig;
export type AliasToken = _AliasToken;
export type GlobalToken = _GlobalToken;

export interface ExtraToken {
  oneColumnWidth: number,
  bigOneColumnWidth: number,
  twoColumnWidth: number,
  bodyBackgroundColor: string,
  logo: string,
  defaultImagePlaceholder: string
  tokensScreenSuccessBackgroundColor: string,
  tokensScreenDangerBackgroundColor: string,
  tokensScreenInfoBackgroundColor: string,
}

export interface AppThemeConfig extends ThemeConfig {
  id: ThemeNames;
  name: string;
  extendToken: ExtraToken,
  logoMap: Web3LogoMap,
}

export type Theme = AppThemeConfig & {
  token: GlobalToken;
}

// todo: will standardized logoMap later
const defaultLogoMap: Web3LogoMap = {
  ...logoMap,
  network: {
    ...IconMap,
    ...SwLogosMap
  },
  symbol: {
    ...IconMap,
    ...SwLogosMap
  },
  default: SwLogosMap.default
};

const currentToken: Partial<GlobalToken> = {
  ...seedToken,
  colorPrimary: '#3073F1',
  colorSecondary: '#44D5DE',
  colorSuccess: '#4CEAAC',
  colorWarning: '#f2d457',
  colorError: '#E42A12',
  colorInfo: '#3073F1',
  colorBgBase: '#131518',
  colorBgDefault: '#131518',
  colorBgSecondary: '#1A1F25',
  colorBgDivider: 'rgba(255, 255, 255, 0.1)',
  colorBgInput: '#1D2B3E',
  bodyFontWeight: '400'
};

export const appTheme: AppThemeConfig = {
  id: ThemeNames.DARK,
  name: 'Dark',
  algorithm: SwReactUI.darkAlgorithm,
  token: currentToken,
  extendToken: {
    oneColumnWidth: 400,
    bigOneColumnWidth: 600,
    twoColumnWidth: 820,
    bodyBackgroundColor: currentToken.colorBgBase || '#000',
    logo: subWalletLogo,
    defaultImagePlaceholder,
    tokensScreenSuccessBackgroundColor: 'linear-gradient(180deg, rgba(76, 234, 172, 0.10) 5%, rgba(217, 217, 217, 0.00) 33%)',
    tokensScreenDangerBackgroundColor: 'linear-gradient(180deg, rgba(234, 76, 76, 0.10) 5%, rgba(217, 217, 217, 0.00) 33%)',
    tokensScreenInfoBackgroundColor: 'linear-gradient(45deg, #78F7FF 9.56%, #31A0FF 44.2%, #DAC7FF 95.08%)'
  },
  logoMap: defaultLogoMap
};
