// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import { CRON_LISTEN_AVAIL_BRIDGE_CLAIM } from '@subwallet/extension-base/constants';
import { CronServiceInterface, ServiceStatus } from '@subwallet/extension-base/services/base/types';
import { EventService } from '@subwallet/extension-base/services/event-service';
import { NotificationDescriptionMap, NotificationTitleMap, ONE_DAY_MILLISECOND } from '@subwallet/extension-base/services/inapp-notification-service/consts';
import { _BaseNotificationInfo, _NotificationInfo, NotificationActionType, NotificationTab, WithdrawClaimNotificationMetadata } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';
import { AvailBridgeSourceChain, AvailBridgeTransaction, fetchAllAvailBridgeClaimable } from '@subwallet/extension-base/services/inapp-notification-service/utils';
import { KeyringService } from '@subwallet/extension-base/services/keyring-service';
import DatabaseService from '@subwallet/extension-base/services/storage-service/DatabaseService';
import { GetNotificationParams, RequestSwitchStatusParams } from '@subwallet/extension-base/types/notification';
import { categoryAddresses, formatNumber } from '@subwallet/extension-base/utils';
import { isSubstrateAddress } from '@subwallet/keyring';

export class InappNotificationService implements CronServiceInterface {
  status: ServiceStatus;
  private readonly dbService: DatabaseService;
  private readonly keyringService: KeyringService;
  private readonly eventService: EventService;
  private refeshAvailBridgeClaimTimeOut: NodeJS.Timeout | undefined;

  constructor (dbService: DatabaseService, keyringService: KeyringService, eventService: EventService) {
    this.status = ServiceStatus.NOT_INITIALIZED;
    this.dbService = dbService;
    this.keyringService = keyringService;
    this.eventService = eventService;
  }

  async init (): Promise<void> {
    this.status = ServiceStatus.INITIALIZING;

    await this.eventService.waitAccountReady;

    this.status = ServiceStatus.INITIALIZED;

    await this.start();

    this.onAccountProxyRemove();
  }

  async markAllRead (proxyId: string) {
    await this.dbService.markAllRead(proxyId);
  }

  async switchReadStatus (params: RequestSwitchStatusParams) {
    await this.dbService.switchReadStatus(params);
  }

  public subscribeUnreadNotificationsCountMap (callback: (data: Record<string, number>) => void) {
    return this.dbService.subscribeUnreadNotificationsCountMap().subscribe(
      {
        next: callback
      }
    );
  }

  public async getUnreadNotificationsCountMap () {
    return await this.dbService.getUnreadNotificationsCountMap();
  }

  public async getNotificationsByParams (params: GetNotificationParams) {
    return this.dbService.getNotificationsByParams(params);
  }

  cleanUpOldNotifications (overdueTime = ONE_DAY_MILLISECOND * 60) {
    return this.dbService.cleanUpOldNotifications(overdueTime);
  }

  passValidateNotification (candidateNotification: _BaseNotificationInfo, notificationFromDB: _NotificationInfo[]) {
    if ([NotificationActionType.WITHDRAW, NotificationActionType.CLAIM].includes(candidateNotification.actionType)) {
      const { actionType, address, metadata, time } = candidateNotification;
      const candidateMetadata = metadata as WithdrawClaimNotificationMetadata;

      for (const notification of notificationFromDB) {
        const comparedMetadata = notification.metadata as WithdrawClaimNotificationMetadata;

        if (notification.address !== address) {
          continue;
        }

        if (notification.actionType !== actionType) {
          continue;
        }

        if (time - notification.time >= ONE_DAY_MILLISECOND) {
          continue;
        }

        const sameNotification = candidateMetadata.stakingType === comparedMetadata.stakingType && candidateMetadata.stakingSlug === comparedMetadata.stakingSlug;

        if (sameNotification) {
          return false;
        }
      }
    }

    if ([NotificationActionType.CLAIM_AVAIL_BRIDGE_ON_ETHEREUM, NotificationActionType.CLAIM_AVAIL_BRIDGE_ON_AVAIL].includes(candidateNotification.actionType)) {
      const { address, metadata, time } = candidateNotification;

      for (const notification of notificationFromDB) {
        const sameNotification = notification.address === address && JSON.stringify(notification.metadata) === JSON.stringify(metadata); // todo: improve compare object
        const overdue = time - notification.time >= 2 * ONE_DAY_MILLISECOND;

        if (sameNotification && !overdue) {
          return false;
        }
      }
    }

    return true;
  }

  async validateAndWriteNotificationsToDB (notifications: _BaseNotificationInfo[], address: string) {
    const proxyId = this.keyringService.context.belongUnifiedAccount(address) || address;
    const newNotifications: _NotificationInfo[] = [];
    const unreadNotifications = await this.getNotificationsByParams({
      notificationTab: NotificationTab.UNREAD,
      proxyId
    });

    for (const notification of notifications) {
      if (this.passValidateNotification(notification, unreadNotifications)) {
        newNotifications.push({
          ...notification,
          proxyId
        });
      }
    }

    await this.dbService.upsertNotifications(newNotifications);
  }

  cronCreateAvailBridgeClaimNotification () {
    clearTimeout(this.refeshAvailBridgeClaimTimeOut);

    this.createAvailBridgeClaimNotification();

    this.refeshAvailBridgeClaimTimeOut = setTimeout(this.cronCreateAvailBridgeClaimNotification.bind(this), CRON_LISTEN_AVAIL_BRIDGE_CLAIM);
  }

  createAvailBridgeClaimNotification () {
    const addresses = this.keyringService.context.getAllAddresses();
    const { evm: evmAddresses, substrate: substrateAddresses } = categoryAddresses(addresses);

    substrateAddresses.forEach((address) => {
      fetchAllAvailBridgeClaimable(address, AvailBridgeSourceChain.ETHEREUM, true)
        .then(async (transactions) => await this.processWriteAvailBridgeClaim(address, transactions))
        .catch(console.error);

      fetchAllAvailBridgeClaimable(address, AvailBridgeSourceChain.ETHEREUM, false)
        .then(async (transactions) => await this.processWriteAvailBridgeClaim(address, transactions))
        .catch(console.error);
    });

    evmAddresses.forEach((address) => {
      fetchAllAvailBridgeClaimable(address, AvailBridgeSourceChain.AVAIL, true)
        .then(async (transactions) => await this.processWriteAvailBridgeClaim(address, transactions))
        .catch(console.error);

      fetchAllAvailBridgeClaimable(address, AvailBridgeSourceChain.AVAIL, false)
        .then(async (transactions) => await this.processWriteAvailBridgeClaim(address, transactions))
        .catch(console.error);
    });
  }

  async processWriteAvailBridgeClaim (address: string, transactions: AvailBridgeTransaction[]) {
    const actionType = isSubstrateAddress(address) ? NotificationActionType.CLAIM_AVAIL_BRIDGE_ON_AVAIL : NotificationActionType.CLAIM_AVAIL_BRIDGE_ON_ETHEREUM;
    const timestamp = Date.now();
    const notifications: _BaseNotificationInfo[] = transactions.map((transaction) => {
      const { amount, depositorAddress, messageId, receiverAddress, sourceBlockHash, sourceChain, sourceTransactionHash, sourceTransactionIndex } = transaction;

      return {
        id: `${actionType}___${messageId}___${timestamp}`,
        address: receiverAddress,
        title: NotificationTitleMap[actionType],
        description: NotificationDescriptionMap[actionType](formatNumber(amount, 18), 'AVAIL'), // todo: improve passing decimal and symbol. Currently only AVAIL with decimal: 18
        time: timestamp,
        extrinsicType: ExtrinsicType.CLAIM_AVAIL_BRIDGE,
        isRead: false,
        actionType,
        metadata: {
          messageId,
          sourceChain,
          sourceTransactionHash,
          depositorAddress,
          receiverAddress,
          amount,
          sourceBlockHash,
          sourceTransactionIndex
        }
      };
    });

    await this.validateAndWriteNotificationsToDB(notifications, address);
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
    this.cleanUpOldNotifications()
      .catch(console.error);

    this.cronCreateAvailBridgeClaimNotification();

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
    return Promise.resolve(undefined);
  }

  onAccountProxyRemove () {
    this.eventService.on('accountProxy.remove', (proxyId: string) => {
      this.removeAccountNotifications(proxyId);
    });
  }

  removeAccountNotifications (proxyId: string) {
    this.dbService.removeAccountNotifications(proxyId).catch(console.error);
  }
}
