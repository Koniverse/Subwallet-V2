// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { COMMON_ASSETS, COMMON_CHAIN_SLUGS } from '@subwallet/chain-list';
import { _ChainAsset } from '@subwallet/chain-list/types';
import { ExtrinsicType } from '@subwallet/extension-base/background/KoniTypes';
import { CRON_LISTEN_AVAIL_BRIDGE_CLAIM } from '@subwallet/extension-base/constants';
import { fetchLastestRemindNotificationTime } from '@subwallet/extension-base/constants/remind-notification-time';
import { CronServiceInterface, ServiceStatus } from '@subwallet/extension-base/services/base/types';
import { ChainService } from '@subwallet/extension-base/services/chain-service';
import { EventService } from '@subwallet/extension-base/services/event-service';
import { NotificationDescriptionMap, NotificationTitleMap, ONE_DAY_MILLISECOND } from '@subwallet/extension-base/services/inapp-notification-service/consts';
import { _BaseNotificationInfo, _NotificationInfo, ClaimAvailBridgeNotificationMetadata, ClaimPolygonBridgeNotificationMetadata, NotificationActionType, NotificationTab, WithdrawClaimNotificationMetadata } from '@subwallet/extension-base/services/inapp-notification-service/interfaces';
import { AvailBridgeSourceChain, AvailBridgeTransaction, fetchAllAvailBridgeClaimable, fetchPolygonBridgeTransactions, hrsToMillisecond, PolygonTransaction } from '@subwallet/extension-base/services/inapp-notification-service/utils';
import { KeyringService } from '@subwallet/extension-base/services/keyring-service';
import DatabaseService from '@subwallet/extension-base/services/storage-service/DatabaseService';
import { GetNotificationParams, RequestSwitchStatusParams } from '@subwallet/extension-base/types/notification';
import { categoryAddresses, formatNumber } from '@subwallet/extension-base/utils';
import { isSubstrateAddress } from '@subwallet/keyring';

export class InappNotificationService implements CronServiceInterface {
  status: ServiceStatus;
  private refeshAvailBridgeClaimTimeOut: NodeJS.Timeout | undefined;

  constructor (
    private readonly dbService: DatabaseService,
    private readonly keyringService: KeyringService,
    private readonly eventService: EventService,
    private readonly chainService: ChainService
  ) {
    this.status = ServiceStatus.NOT_INITIALIZED;
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

  public async fetchNotificationsByParams (params: GetNotificationParams) {
    return this.dbService.getNotificationsByParams(params);
  }

  public async getNotificationById (id: string) {
    return this.dbService.getNotification(id);
  }

  cleanUpOldNotifications (overdueTime = ONE_DAY_MILLISECOND * 60) {
    return this.dbService.cleanUpOldNotifications(overdueTime);
  }

  passValidateNotification (candidateNotification: _BaseNotificationInfo, comparedNotifications: _NotificationInfo[], remindTimeConfigInHrs: Record<NotificationActionType, number>) { // todo: simplify condition !!
    if ([NotificationActionType.WITHDRAW, NotificationActionType.CLAIM].includes(candidateNotification.actionType)) {
      const { actionType, address, metadata, time } = candidateNotification;
      const candidateMetadata = metadata as WithdrawClaimNotificationMetadata;
      const remindTime = hrsToMillisecond(remindTimeConfigInHrs[candidateNotification.actionType]);

      for (const comparedNotification of comparedNotifications) {
        const specialCase = comparedNotification.actionType === NotificationActionType.WITHDRAW && !comparedNotification.isRead;

        if (comparedNotification.address !== address) {
          continue;
        }

        if (comparedNotification.actionType !== actionType) {
          continue;
        }

        const comparedMetadata = comparedNotification.metadata as WithdrawClaimNotificationMetadata;
        const sameNotification = candidateMetadata.stakingType === comparedMetadata.stakingType && candidateMetadata.stakingSlug === comparedMetadata.stakingSlug;

        if (!sameNotification) {
          continue;
        }

        if (time - comparedNotification.time <= remindTime) {
          return false;
        } else {
          if (specialCase) {
            return false;
          }
        }
      }
    }

    if ([NotificationActionType.CLAIM_AVAIL_BRIDGE_ON_ETHEREUM, NotificationActionType.CLAIM_AVAIL_BRIDGE_ON_AVAIL].includes(candidateNotification.actionType)) {
      const { address, metadata, time } = candidateNotification;
      const candidateMetadata = metadata as ClaimAvailBridgeNotificationMetadata;
      const remindTime = hrsToMillisecond(remindTimeConfigInHrs[candidateNotification.actionType]);

      for (const notification of comparedNotifications) {
        if (notification.address !== address) {
          continue;
        }

        if (time - notification.time >= remindTime) {
          continue;
        }

        const comparedMetadata = notification.metadata as ClaimAvailBridgeNotificationMetadata;
        const sameNotification =
          candidateMetadata.messageId === comparedMetadata.messageId &&
          candidateMetadata.sourceBlockHash === comparedMetadata.sourceBlockHash &&
          candidateMetadata.sourceTransactionHash === comparedMetadata.sourceTransactionHash;

        if (sameNotification) {
          return false;
        }
      }
    }

    if ([NotificationActionType.CLAIM_POLYGON_BRIDGE].includes(candidateNotification.actionType)) {
      const { address, metadata, time } = candidateNotification;
      const candidateMetadata = metadata as ClaimPolygonBridgeNotificationMetadata;
      const remindTime = hrsToMillisecond(remindTimeConfigInHrs[candidateNotification.actionType]);

      for (const notification of comparedNotifications) {
        if (notification.address !== address) {
          continue;
        }

        if (time - notification.time >= remindTime) {
          continue;
        }

        const comparedMetadata = notification.metadata as ClaimPolygonBridgeNotificationMetadata;
        const sameNotification =
          candidateMetadata._id === comparedMetadata._id &&
          candidateMetadata.transactionHash === comparedMetadata.transactionHash &&
          candidateMetadata.counter === comparedMetadata.counter;

        if (sameNotification) {
          return false;
        }
      }
    }

    return true;
  }

  async validateAndWriteNotificationsToDB (notifications: _BaseNotificationInfo[], address: string) {
    const proxyId = this.keyringService.context.belongUnifiedAccount(address) || address;
    const accountName = this.keyringService.context.getCurrentAccountProxyName(proxyId);
    const passNotifications: _NotificationInfo[] = [];
    const [comparedNotifications, remindTimeConfig] = await Promise.all([
      this.fetchNotificationsByParams({ notificationTab: NotificationTab.ALL, proxyId }),
      await fetchLastestRemindNotificationTime()
    ]);

    for (const candidateNotification of notifications) {
      candidateNotification.title = candidateNotification.title.replace('{{accountName}}', accountName);

      if (this.passValidateNotification(candidateNotification, comparedNotifications, remindTimeConfig)) {
        passNotifications.push({
          ...candidateNotification,
          proxyId
        });
      }
    }

    await this.dbService.upsertNotifications(passNotifications);
  }

  cronCreateBridgeClaimNotification () {
    clearTimeout(this.refeshAvailBridgeClaimTimeOut);

    this.createAvailBridgeClaimNotification();

    this.createPolygonClaimableTransactions().catch((err) => {
      console.error('Error:', err);
    });

    this.refeshAvailBridgeClaimTimeOut = setTimeout(this.cronCreateBridgeClaimNotification.bind(this), CRON_LISTEN_AVAIL_BRIDGE_CLAIM);
  }

  getCategorizedAddresses () {
    const addresses = this.keyringService.context.getAllAddresses();

    return categoryAddresses(addresses);
  }

  createAvailBridgeClaimNotification () {
    const { evm: evmAddresses, substrate: substrateAddresses } = this.getCategorizedAddresses();

    const chainAssets = this.chainService.getAssetRegistry();

    enum ASSET_TYPE {
      TEST_EVM = 'test_evm',
      TEST_SUBSTRATE = 'test_substrate',
      MAIN_EVM = 'main_evm',
      MAIN_SUBSTRATE = 'main_substrate'
    }

    const chainAssetMap = Object.values(chainAssets).reduce((acc, chainAsset) => {
      let type: ASSET_TYPE | undefined;

      if (chainAsset.symbol === 'AVAIL') {
        if (chainAsset.originChain === 'sepolia_ethereum') {
          type = ASSET_TYPE.TEST_EVM;
        } else if (chainAsset.originChain === 'availTuringTest') {
          type = ASSET_TYPE.TEST_SUBSTRATE;
        } else if (chainAsset.originChain === 'ethereum') {
          type = ASSET_TYPE.MAIN_EVM;
        } else if (chainAsset.originChain === 'avail_mainnet') {
          type = ASSET_TYPE.MAIN_SUBSTRATE;
        }
      }

      if (type) {
        acc[type] = chainAsset;
      }

      return acc;
    }, {} as Record<ASSET_TYPE, _ChainAsset>);

    substrateAddresses.forEach((address) => {
      fetchAllAvailBridgeClaimable(address, AvailBridgeSourceChain.ETHEREUM, true)
        .then(async (transactions) => await this.processWriteAvailBridgeClaim(address, transactions, chainAssetMap[ASSET_TYPE.TEST_SUBSTRATE]))
        .catch(console.error);

      fetchAllAvailBridgeClaimable(address, AvailBridgeSourceChain.ETHEREUM, false)
        .then(async (transactions) => await this.processWriteAvailBridgeClaim(address, transactions, chainAssetMap[ASSET_TYPE.MAIN_SUBSTRATE]))
        .catch(console.error);
    });

    evmAddresses.forEach((address) => {
      fetchAllAvailBridgeClaimable(address, AvailBridgeSourceChain.AVAIL, true)
        .then(async (transactions) => await this.processWriteAvailBridgeClaim(address, transactions, chainAssetMap[ASSET_TYPE.TEST_EVM]))
        .catch(console.error);

      fetchAllAvailBridgeClaimable(address, AvailBridgeSourceChain.AVAIL, false)
        .then(async (transactions) => await this.processWriteAvailBridgeClaim(address, transactions, chainAssetMap[ASSET_TYPE.MAIN_EVM]))
        .catch(console.error);
    });
  }

  async processWriteAvailBridgeClaim (address: string, transactions: AvailBridgeTransaction[], token: _ChainAsset) {
    const actionType = isSubstrateAddress(address) ? NotificationActionType.CLAIM_AVAIL_BRIDGE_ON_AVAIL : NotificationActionType.CLAIM_AVAIL_BRIDGE_ON_ETHEREUM;
    const timestamp = Date.now();
    const symbol = token.symbol;
    const decimals = token.decimals ?? 0;
    const notifications: _BaseNotificationInfo[] = transactions.map((transaction) => {
      const { amount, depositorAddress, messageId, receiverAddress, sourceBlockHash, sourceChain, sourceTransactionHash, sourceTransactionIndex, status } = transaction;
      const metadata: ClaimAvailBridgeNotificationMetadata = {
        chainSlug: token.originChain,
        tokenSlug: token.slug,
        messageId,
        sourceChain,
        sourceTransactionHash,
        depositorAddress,
        receiverAddress,
        amount,
        sourceBlockHash,
        sourceTransactionIndex,
        status
      };

      return {
        id: `${actionType}___${messageId}___${timestamp}`,
        address: address, // address is receiverAddress
        title: NotificationTitleMap[actionType].replace('{{tokenSymbol}}', symbol),
        description: NotificationDescriptionMap[actionType](formatNumber(amount, decimals), symbol),
        time: timestamp,
        extrinsicType: ExtrinsicType.CLAIM_BRIDGE,
        isRead: false,
        actionType,
        metadata
      };
    });

    await this.validateAndWriteNotificationsToDB(notifications, address);
  }

  // Polygon Claimable Handle
  async createPolygonClaimableTransactions () {
    const { evm: evmAddresses } = this.getCategorizedAddresses();
    const etherChains = [COMMON_ASSETS.ETH, COMMON_ASSETS.ETH_SEPOLIA];

    const polygonAssets = Object.values(this.chainService.getAssetRegistry()).filter(
      (asset) => etherChains.includes(asset.slug as COMMON_ASSETS)
    );

    for (const polygonAsset of polygonAssets) {
      const isTestnet = polygonAsset?.originChain === COMMON_CHAIN_SLUGS.ETHEREUM_SEPOLIA;

      if (evmAddresses.length === 0) {
        return;
      }

      for (const address of evmAddresses) {
        const response = await fetchPolygonBridgeTransactions(address, isTestnet);

        if (response && response.success) {
          await this.processPolygonClaimNotification(address, response.result, polygonAsset);
        }
      }
    }
  }

  async processPolygonClaimNotification (address: string, transactions: PolygonTransaction[], token: _ChainAsset) {
    const actionType = NotificationActionType.CLAIM_POLYGON_BRIDGE;
    const timestamp = Date.now();
    const symbol = token.symbol;
    const decimals = token.decimals ?? 0;
    const notifications: _BaseNotificationInfo[] = transactions.map((transaction) => {
      const { _id, amounts, bridgeType, counter, destinationNetwork, originTokenAddress, originTokenNetwork, receiver, sourceNetwork, status, transactionHash, transactionInitiator, userAddress } = transaction;
      const metadata: ClaimPolygonBridgeNotificationMetadata = {
        chainSlug: token.originChain,
        tokenSlug: token.slug,
        _id,
        amounts,
        bridgeType,
        counter,
        destinationNetwork,
        originTokenAddress,
        originTokenNetwork,
        receiver,
        sourceNetwork,
        status,
        transactionHash,
        transactionInitiator,
        userAddress
      };

      return {
        id: `${actionType}___${_id}___${timestamp}`,
        address: address,
        title: NotificationTitleMap[actionType].replace('{{tokenSymbol}}', symbol),
        description: NotificationDescriptionMap[actionType](formatNumber(amounts[0], decimals), symbol),
        time: timestamp,
        extrinsicType: ExtrinsicType.CLAIM_BRIDGE,
        isRead: false,
        actionType,
        metadata
      };
    });

    await this.validateAndWriteNotificationsToDB(notifications, address);
  }

  // Polygon Claimable Handle

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
    this.cronCreateBridgeClaimNotification();

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
