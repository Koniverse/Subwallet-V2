// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-assignment
import { ChainInfoMap } from '@subwallet/chain-list';
import { BlockedActionsFeaturesMap, EnvConfig } from '@subwallet/extension-base/constants';
import { NotificationActionType } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-var-requires
export const buyServiceInfos: Record<string, unknown>[] = require('./buyServiceInfos.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-assignment
export const buyTokenConfigs: Record<string, unknown>[] = require('./buyTokenConfigs.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-assignment
export const crowdloanFunds: Record<string, unknown>[] = require('./crowdloanFunds.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-assignment
export const marketingCampaigns: Record<string, unknown> = require('./marketingCampaigns.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-assignment
export const termAndCondition: Record<string, unknown> = require('./termAndCondition.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-assignment
export const currencySymbol: Record<string, unknown> = require('./currencySymbol.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-assignment
export const blockedActionsFeatures: BlockedActionsFeaturesMap = require('./blockedActionsFeatures.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-assignment
export const remindNotificationTime: Record<NotificationActionType, number> = require('./remindNotificationTime.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires,@typescript-eslint/no-unsafe-assignment
export const blockedActions: Record<string, EnvConfig> = require('./blockedActions.json');

export enum StaticKey {
  BUY_SERVICE_INFOS = 'buy-service-infos',
  CHAINS = 'chains',
  CURRENCY_SYMBOL = 'currency_symbols',
  MARKETING_CAMPAINGS = 'marketing-campaigns',
  CROWDLOAN_FUNDS = 'crowdloan-funds',
  TERM_AND_CONDITION = 'term-and-condition',
  BUY_TOKEN_CONFIGS = 'buy-token-configs',
  BLOCKED_ACTIONS_FEATURES = 'blocked-actions-features',
  REMIND_NOTIFICATION_TIME = 'remind-notification-time',
  BLOCKED_ACTIONS = 'blocked-actions',
}

export const staticData = {
  [StaticKey.CHAINS]: Object.values(ChainInfoMap),
  [StaticKey.CURRENCY_SYMBOL]: currencySymbol,
  [StaticKey.BUY_SERVICE_INFOS]: buyServiceInfos,
  [StaticKey.CROWDLOAN_FUNDS]: crowdloanFunds,
  [StaticKey.MARKETING_CAMPAINGS]: marketingCampaigns,
  [StaticKey.TERM_AND_CONDITION]: termAndCondition.default,
  [StaticKey.BUY_TOKEN_CONFIGS]: buyTokenConfigs,
  [StaticKey.BLOCKED_ACTIONS_FEATURES]: blockedActionsFeatures,
  [StaticKey.REMIND_NOTIFICATION_TIME]: remindNotificationTime,
  [StaticKey.BLOCKED_ACTIONS]: blockedActions
};
