// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import { CRON_FETCH_NOTIFICATION_INTERVAL, CRON_LISTEN_NOTIFICATION_INTERVAL } from '@subwallet/extension-base/constants';
import { CronServiceInterface, ServiceStatus } from '@subwallet/extension-base/services/base/types';
import { ChainService } from '@subwallet/extension-base/services/chain-service';
import EarningService from '@subwallet/extension-base/services/earning-service/service';
import { EventService } from '@subwallet/extension-base/services/event-service';
import { NotificationDescriptionMap, NotificationTitleMap } from '@subwallet/extension-base/services/inapp-notification-service/consts';
import { _NotificationInfo, NotificationActionType } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';
import DatabaseService from '@subwallet/extension-base/services/storage-service/DatabaseService';
import { UnstakingStatus } from '@subwallet/extension-base/types';
import { GetNotificationCountResult, GetNotificationParams } from '@subwallet/extension-base/types/notification';
import { formatNumber } from '@subwallet/extension-base/utils';
import { BehaviorSubject } from 'rxjs';

export class InappNotificationService implements CronServiceInterface {
  status: ServiceStatus;
  private refreshGetNotificationTimeout: NodeJS.Timeout | undefined;
  private refreshListenNotificationTimeout: NodeJS.Timeout | undefined;
  private readonly dbService: DatabaseService;
  private readonly chainService: ChainService;
  private readonly earningService: EarningService;
  private readonly eventService: EventService;
  private unreadNotificationCountSubject = new BehaviorSubject<GetNotificationCountResult>({ count: 0 });

  constructor (dbService: DatabaseService, chainService: ChainService, earningService: EarningService, eventService: EventService) {
    this.status = ServiceStatus.NOT_INITIALIZED;
    this.dbService = dbService;
    this.chainService = chainService;
    this.earningService = earningService;
    this.eventService = eventService;
  }

  async markAllRead (address: string) {
    await this.dbService.markAllRead(address);
  }

  async changeReadStatus (notification: _NotificationInfo) {
    await this.dbService.changeReadStatus(notification);
  }

  // todo:
  // createSendNotifications
  // createReceiveNotifications
  async createClaimNotifications () {
    const notificationActionType = NotificationActionType.CLAIM;
    const allClaimNotifications: _NotificationInfo[] = [];

    await this.earningService.waitEarningRewardReady();
    const claimRewardMap = this.earningService.getEarningRewards().data;

    if (!Object.keys(claimRewardMap).length) {
      return allClaimNotifications;
    }

    const timestamp = Date.now();

    for (const claimItemInfo of Object.values(claimRewardMap)) {
      const stakingSlug = claimItemInfo.slug;
      const stakingType = claimItemInfo.type;
      const rawClaimAmount = claimItemInfo.unclaimedReward || '0';
      const yieldPoolInfo = await this.dbService.getYieldPool(stakingSlug);

      if (!yieldPoolInfo || rawClaimAmount === '0') {
        continue;
      }

      const tokenSlug = yieldPoolInfo.metadata.inputAsset; // todo: recheck with altInputAsset
      const tokenInfo = this.chainService.getAssetBySlug(tokenSlug);
      const decimal = tokenInfo.decimals || 0;
      const symbol = tokenInfo.symbol;

      const amount = formatNumber(rawClaimAmount, decimal);

      allClaimNotifications.push({
        id: `${notificationActionType}___${stakingSlug}___${timestamp}`,
        title: NotificationTitleMap[notificationActionType],
        description: NotificationDescriptionMap[notificationActionType](amount, symbol, stakingType),
        address: claimItemInfo.address,
        time: timestamp,
        extrinsicType: ExtrinsicType.STAKING_CLAIM_REWARD,
        isRead: false,
        actionType: notificationActionType,
        metadata: {
          stakingType,
          stakingSlug
        }
      });
    }

    return allClaimNotifications;
  }

  async createWithdrawNotifications () {
    const notificationActionType = NotificationActionType.WITHDRAW;
    const allWithdrawNotifications: _NotificationInfo[] = [];
    const poolPositions = await this.dbService.getYieldPositions();

    for (const poolPosition of poolPositions) {
      if (!poolPosition.unstakings.length) {
        continue;
      }

      const stakingType = poolPosition.type;
      const stakingSlug = poolPosition.slug;

      const timestamp = Date.now();

      for (const unstaking of poolPosition.unstakings) {
        const isClaimable = unstaking.status === UnstakingStatus.CLAIMABLE;
        const rawClaimableAmount = unstaking.claimable;
        const tokenInfo = this.chainService.getAssetBySlug(poolPosition.balanceToken);
        const decimal = tokenInfo.decimals || 0;
        const symbol = tokenInfo.symbol;
        const amount = formatNumber(rawClaimableAmount, decimal);

        if (isClaimable) {
          allWithdrawNotifications.push({
            id: `${notificationActionType}___${stakingSlug}___${timestamp}`,
            title: NotificationTitleMap[notificationActionType],
            description: NotificationDescriptionMap[notificationActionType](amount, symbol, stakingType),
            address: poolPosition.address,
            time: timestamp,
            extrinsicType: ExtrinsicType.STAKING_WITHDRAW,
            isRead: false,
            actionType: notificationActionType,
            metadata: {
              stakingType,
              stakingSlug
            }
          });
        }
      }
    }

    return allWithdrawNotifications;
  }

  private async updateUnreadNotificationCountSubject () {
    const unreadNotificationCount = await this.dbService.getAllUnreadNotifications();

    this.unreadNotificationCountSubject.next({ count: unreadNotificationCount });
  }

  public subscribeUnreadNotificationCount (callback: (data: GetNotificationCountResult) => void) {
    return this.unreadNotificationCountSubject.subscribe({
      next: callback
    });
  }

  public getUnreadNotificationCount () {
    return this.unreadNotificationCountSubject.getValue();
  }

  public async getNotificationsByParams (params: GetNotificationParams) {
    return await this.dbService.getNotificationsByParams(params);
  }

  cronCreateLatestNotifications () {
    clearTimeout(this.refreshGetNotificationTimeout);

    this.createWithdrawNotifications()
      .then(async (notifications) => {
        await this.dbService.upsertNotifications(notifications);
      })
      .catch((e) => {
        console.error(e);
      });

    this.createClaimNotifications()
      .then(async (notifications) => {
        await this.dbService.upsertNotifications(notifications);
      })
      .catch((e) => {
        console.error(e);
      });

    this.refreshGetNotificationTimeout = setTimeout(this.cronCreateLatestNotifications.bind(this), CRON_FETCH_NOTIFICATION_INTERVAL);
  }

  cronListenLatestNotifications () {
    clearTimeout(this.refreshListenNotificationTimeout);

    this.updateUnreadNotificationCountSubject()
      .then().catch((e) => console.error(e));

    this.refreshListenNotificationTimeout = setTimeout(this.cronListenLatestNotifications.bind(this), CRON_LISTEN_NOTIFICATION_INTERVAL);
  }

  async start (): Promise<void> {
    if (this.status === ServiceStatus.STARTED) {
      return;
    }

    try {
      this.status = ServiceStatus.STARTING;
      await this.startCron();
      this.status = ServiceStatus.STARTED;
    } catch (e) {

    }
  }

  async startCron (): Promise<void> {
    await this.eventService.waitChainReady;
    await this.eventService.waitEarningReady;
    this.cronListenLatestNotifications();
    this.cronCreateLatestNotifications();

    return Promise.resolve();
  }

  async stop (): Promise<void> {
    try {
      this.status = ServiceStatus.STOPPING;
      await this.stopCron();
      this.status = ServiceStatus.STOPPED;
    } catch (e) {

    }
  }

  stopCron (): Promise<void> {
    clearTimeout(this.refreshGetNotificationTimeout);
    clearTimeout(this.refreshListenNotificationTimeout);

    return Promise.resolve(undefined);
  }
}
