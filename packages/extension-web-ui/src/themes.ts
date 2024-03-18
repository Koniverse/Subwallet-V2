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
import derivative from '@subwallet/react-ui/es/theme/themes/dark';
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

const currentToken = {
  ...seedToken,
  colorPrimary: '#3073F1',
  colorSecondary: '#44D5DE',
  bodyFontWeight: '400',
  fontFamily: '\'THICCCBOI\', sans-serif',
  fontBase: '\'THICCCBOI\', sans-serif'
};

export const appTheme: AppThemeConfig = {
  id: ThemeNames.DARK,
  name: 'Dark',
  algorithm: SwReactUI.darkAlgorithm,
  token: derivative(currentToken),
  extendToken: {
    oneColumnWidth: 400,
    bigOneColumnWidth: 600,
    twoColumnWidth: 820,
    bodyBackgroundColor: '#151515',
    logo: subWalletLogo,
    defaultImagePlaceholder,
    tokensScreenSuccessBackgroundColor: 'linear-gradient(180deg, rgba(76, 234, 172, 0.10) 5%, rgba(217, 217, 217, 0.00) 33%)',
    tokensScreenDangerBackgroundColor: 'linear-gradient(180deg, rgba(234, 76, 76, 0.10) 5%, rgba(217, 217, 217, 0.00) 33%)',
    tokensScreenInfoBackgroundColor: 'linear-gradient(rgba(0, 75, 255, 0.1) 5%, rgba(217, 217, 217, 0) 33%)'
  },
  logoMap: defaultLogoMap
};
