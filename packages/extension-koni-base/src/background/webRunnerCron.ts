// Copyright 2019-2022 @subwallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ApiMap, ApiProps, CronServiceType, CronType, CurrentAccountInfo, CustomToken, NETWORK_STATUS, NetworkJson, NftTransferExtra, ServiceInfo, StakingType, SubscriptionServiceType, UnlockingStakeInfo } from '@subwallet/extension-base/background/KoniTypes';
import { CHAIN_TYPES, getUnlockingInfo } from '@subwallet/extension-koni-base/api/bonding';
import { getTokenPrice } from '@subwallet/extension-koni-base/api/coingecko';
import { getNominationStakingRewardData, getPoolingStakingRewardData } from '@subwallet/extension-koni-base/api/staking';
import { getAmplitudeUnclaimedStakingReward } from '@subwallet/extension-koni-base/api/staking/paraChain';
import { fetchMultiChainHistories } from '@subwallet/extension-koni-base/api/subsquid/subsquid-multi-chain-history';
import { nftHandler } from '@subwallet/extension-koni-base/background/handlers';
import KoniState from '@subwallet/extension-koni-base/background/handlers/State';
import WebRunnerSubscription from '@subwallet/extension-koni-base/background/webRunnerSubscription';
import { ALL_ACCOUNT_KEY, CRON_AUTO_RECOVER_DOTSAMA_INTERVAL, CRON_GET_API_MAP_STATUS, CRON_REFRESH_HISTORY_INTERVAL, CRON_REFRESH_NFT_INTERVAL, CRON_REFRESH_PRICE_INTERVAL, CRON_REFRESH_STAKE_UNLOCKING_INFO, CRON_REFRESH_STAKING_REWARD_FAST_INTERVAL, CRON_REFRESH_STAKING_REWARD_INTERVAL } from '@subwallet/extension-koni-base/constants';
import { Subject, Subscription } from 'rxjs';
import Web3 from 'web3';

import { logger as createLogger } from '@polkadot/util/logger';
import { Logger } from '@polkadot/util/types';

const defaultIntervalMap: Record<CronType, number> = {
  recoverApiMap: CRON_AUTO_RECOVER_DOTSAMA_INTERVAL,
  checkApiMapStatus: CRON_GET_API_MAP_STATUS,
  refreshHistory: CRON_REFRESH_HISTORY_INTERVAL,
  refreshNft: CRON_REFRESH_NFT_INTERVAL,
  refreshPrice: CRON_REFRESH_PRICE_INTERVAL,
  refreshStakeUnlockingInfo: CRON_REFRESH_STAKE_UNLOCKING_INFO,
  refreshStakingReward: CRON_REFRESH_STAKING_REWARD_INTERVAL,
  refreshPoolingStakingReward: CRON_REFRESH_STAKING_REWARD_FAST_INTERVAL
};

const cronServiceRelationMap: Record<CronServiceType, CronType[]> = {
  checkApiStatus: ['checkApiMapStatus'],
  recoverApi: ['recoverApiMap'],
  history: ['refreshHistory'],
  nft: ['refreshNft'],
  price: ['refreshPrice'],
  staking: ['refreshStakeUnlockingInfo', 'refreshStakingReward', 'refreshPoolingStakingReward']
};

export default class WebRunnerCron {
  private readonly activeServiceMap: Record<CronServiceType, boolean>;
  private readonly serviceInfoSubscriptionMap: Record<CronServiceType, Subscription | undefined>;
  private readonly cronMap: Record<CronType, NodeJS.Timer | undefined>;
  private readonly intervalMap: Record<CronType, number>;
  private readonly activeServiceMapSubject: Subject<Record<CronServiceType, boolean>>;
  private webRunnerSubscription: WebRunnerSubscription;
  private state: KoniState;
  private logger: Logger;

  constructor (state: KoniState, webRunnerSubscription: WebRunnerSubscription, intervalMap: Record<CronType, number> = defaultIntervalMap) {
    this.state = state;
    this.webRunnerSubscription = webRunnerSubscription;
    this.intervalMap = intervalMap;
    this.activeServiceMapSubject = new Subject<Record<CronServiceType, boolean>>();
    this.logger = createLogger('WebRunnerCron');
    this.activeServiceMap = {
      checkApiStatus: false,
      recoverApi: false,
      history: false,
      nft: false,
      price: false,
      staking: false
    };
    this.serviceInfoSubscriptionMap = {
      checkApiStatus: undefined,
      recoverApi: undefined,
      history: undefined,
      nft: undefined,
      price: undefined,
      staking: undefined
    };
    this.cronMap = {
      recoverApiMap: undefined,
      checkApiMapStatus: undefined,
      refreshHistory: undefined,
      refreshNft: undefined,
      refreshPrice: undefined,
      refreshStakeUnlockingInfo: undefined,
      refreshStakingReward: undefined,
      refreshPoolingStakingReward: undefined
    };
  }

  // price

  private refreshPrice = () => {
    // Update for tokens price
    const coinGeckoKeys = Object.values(this.state.getNetworkMap())
      .map((network) => network.coinGeckoKey).filter((key) => key) as string[];

    getTokenPrice(coinGeckoKeys)
      .then((rs) => {
        this.state.setPrice(rs, () => {
          this.logger.log('Get Token Price From CoinGecko');
        });
      })
      .catch(this.logger.warn);
  };

  // nft

  // refer: initNftSubscription in subscription.ts
  private nftHandle = (
    addresses: string[],
    dotSamaApiMap: Record<string, ApiProps>,
    web3ApiMap: Record<string, Web3>,
    customNftRegistry: CustomToken[],
    contractSupportedNetworkMap: Record<string, NetworkJson>
  ) => {
    const { cronUpdate, forceUpdate, selectedNftCollection } = this.state.getNftTransfer();

    if (forceUpdate && !cronUpdate) {
      this.logger.log('skipping set nft state due to transfer');
      this.state.setNftTransfer({
        cronUpdate: true,
        forceUpdate: true,
        selectedNftCollection
      } as NftTransferExtra);
    } else { // after skipping 1 time of cron update
      this.state.setNftTransfer({
        cronUpdate: false,
        forceUpdate: false,
        selectedNftCollection
      } as NftTransferExtra);

      nftHandler.setContractSupportedNetworkMap(contractSupportedNetworkMap);
      nftHandler.setDotSamaApiMap(dotSamaApiMap);
      nftHandler.setWeb3ApiMap(web3ApiMap);
      nftHandler.setAddresses(addresses);

      nftHandler.handleNfts(
        customNftRegistry,
        (...args) => this.state.updateNftData(...args),
        (...args) => this.state.setNftCollection(...args),
        (...args) => this.state.updateNftIds(...args),
        (...args) => this.state.updateCollectionIds(...args))
        .then(() => {
          this.logger.log('nft state updated');
        })
        .catch(this.logger.warn);
    }
  };

  private refreshNft = (address: string, apiMap: ApiMap, customNftRegistry: CustomToken[], contractSupportedNetworkMap: Record<string, NetworkJson>) => {
    return () => {
      this.logger.log('Refresh Nft state');
      this.state.getDecodedAddresses(address)
        .then((addresses) => {
          if (!addresses.length) {
            return;
          }

          this.nftHandle(addresses, apiMap.dotSama, apiMap.web3, customNftRegistry, contractSupportedNetworkMap);
        })
        .catch(this.logger.warn);
    };
  };

  private resetNft = (newAddress: string) => {
    this.logger.log('Reset Nft state');
    this.state.resetNft(newAddress).catch(this.logger.warn);
  };

  private resetNftTransferMeta = () => {
    this.state.setNftTransfer({
      cronUpdate: false,
      forceUpdate: false
    } as NftTransferExtra);
  };

  // staking

  // refer: subscribeStakingReward in subscription.ts
  private stakingRewardHandle = async (address: string) => {
    const addresses = await this.state.getDecodedAddresses(address);

    if (!addresses.length) {
      return;
    }

    const networkMap = this.state.getNetworkMap();
    const targetNetworkMap: Record<string, NetworkJson> = {};

    Object.entries(networkMap).forEach(([key, network]) => {
      if (network.active && network.getStakingOnChain) {
        targetNetworkMap[key] = network;
      }
    });

    const result = await getNominationStakingRewardData(addresses, targetNetworkMap);

    this.state.updateStakingReward(result, 'slowInterval');
    this.logger.log('Set staking reward state done', result);
  };

  // refer: subscribeStakingRewardFastInterval in subscription.ts
  async stakingRewardFastIntervalHandle (address: string) {
    const addresses = await this.state.getDecodedAddresses(address);

    if (!addresses.length) {
      return;
    }

    const pooledStakingItems = await this.state.getPooledStakingRecordsByAddress(addresses);

    const pooledAddresses: string[] = [];

    pooledStakingItems.forEach((pooledItem) => {
      if (!pooledAddresses.includes(pooledItem.address)) {
        pooledAddresses.push(pooledItem.address);
      }
    });

    const networkMap = this.state.getNetworkMap();
    const targetNetworkMap: Record<string, NetworkJson> = {};

    Object.entries(networkMap).forEach(([key, network]) => {
      if (network.active && network.getStakingOnChain) {
        targetNetworkMap[key] = network;
      }
    });

    const activeNetworks: string[] = [];

    Object.keys(targetNetworkMap).forEach((key) => {
      activeNetworks.push(key);
    });

    const [poolingStakingRewards, amplitudeUnclaimedStakingRewards] = await Promise.all([
      getPoolingStakingRewardData(pooledAddresses, targetNetworkMap, this.state.getDotSamaApiMap()),
      getAmplitudeUnclaimedStakingReward(this.state.getDotSamaApiMap(), addresses, networkMap, activeNetworks)
    ]);

    const result = [...poolingStakingRewards, ...amplitudeUnclaimedStakingRewards];

    this.state.updateStakingReward(result, 'fastInterval');
    this.logger.log('Set staking reward state with fast interval done', result);
  }

  private refreshStakingReward = (address: string) => {
    return () => {
      this.logger.log('Fetching staking reward data');
      this.stakingRewardHandle(address)
        .then(() => this.logger.log('Refresh staking reward state'))
        .catch(this.logger.warn);
    };
  };

  private refreshStakingRewardFastInterval = (address: string) => {
    return () => {
      this.logger.log('Fetching staking reward data with fast interval');
      this.stakingRewardFastIntervalHandle(address)
        .then(() => this.logger.log('Refresh pooling staking reward state with fast interval'))
        .catch(this.logger.error);
    };
  };

  resetStakingReward = () => {
    this.logger.log('Reset Staking Reward State');
    this.state.resetStakingReward();
  };

  // refer: subscribeStakeUnlockingInfo in subscription.ts
  private stakeUnlockingInfoHandle = async (address: string, networkMap: Record<string, NetworkJson>, dotSamaApiMap: Record<string, ApiProps>) => {
    const addresses = await this.state.getDecodedAddresses(address);
    const currentAddress = addresses[0]; // only get info for the current account

    const stakeUnlockingInfo: UnlockingStakeInfo[] = [];

    if (!addresses.length) {
      return;
    }

    const stakingItems = await this.state.getStakingRecordsByAddress(currentAddress); // only get records of active networks

    await Promise.all(stakingItems.map(async (stakingItem) => {
      const needUpdateUnlockingStake = parseFloat(stakingItem.balance as string) > 0 && stakingItem.type === StakingType.NOMINATED;
      const networkJson = networkMap[stakingItem.chain];

      if (needUpdateUnlockingStake) {
        let extraCollatorAddress;

        if (CHAIN_TYPES.amplitude.includes(stakingItem.chain)) {
          const extraDelegationInfo = await this.state.getExtraDelegationInfo(stakingItem.chain, stakingItem.address);

          if (extraDelegationInfo) {
            extraCollatorAddress = extraDelegationInfo.collatorAddress;
          }
        }

        const unlockingInfo = await getUnlockingInfo(dotSamaApiMap[stakingItem.chain], networkJson, stakingItem.chain, currentAddress, stakingItem.type, extraCollatorAddress);

        stakeUnlockingInfo.push(unlockingInfo);
      }
    }));

    this.state.setStakeUnlockingInfo({
      timestamp: +new Date(),
      details: stakeUnlockingInfo
    });
  };

  private refreshStakeUnlockingInfo = (address: string, networkMap: Record<string, NetworkJson>, dotSamaApiMap: Record<string, ApiProps>) => {
    return () => {
      if (address.toLowerCase() !== ALL_ACCOUNT_KEY) {
        this.stakeUnlockingInfoHandle(address, networkMap, dotSamaApiMap)
          .then(() => this.logger.log('Refresh staking unlocking info done'))
          .catch(this.logger.warn);
      }
    };
  };

  // history
  private refreshHistory2 = (currentAddress: string) => {
    return () => {
      const addresses = currentAddress === ALL_ACCOUNT_KEY ? [currentAddress] : Object.values(this.state.getAllAddresses());

      this.logger.log('Refresh History state');
      fetchMultiChainHistories(addresses).then((historiesMap) => {
        Object.entries(historiesMap).forEach(([address, data]) => {
          data.forEach((item) => {
            this.state.setHistory(address, item.networkKey, item);
          });
        });
      }).catch((err) => this.logger.warn(err));
    };
  };

  private resetHistory = (address: string): Promise<void> => {
    return this.state.resetHistoryMap(address).catch(this.logger.warn);
  };

  // recoverApi

  private recoverApiMap = () => {
    const apiMap = this.state.getApiMap();

    let refreshCounter = 0;

    for (const apiProp of Object.values(apiMap.dotSama)) {
      if (!apiProp.isApiConnected) {
        apiProp.recoverConnect && apiProp.recoverConnect();

        refreshCounter++;
      }
    }

    for (const [key, web3] of Object.entries(apiMap.web3)) {
      web3.eth.net.isListening()
        .catch(() => {
          this.state.refreshWeb3Api(key);
          refreshCounter++;
        });
    }

    if (refreshCounter > 0) {
      const activeSubscriptionServiceMap = this.webRunnerSubscription.getActiveServiceMap();

      (Object.keys(activeSubscriptionServiceMap) as SubscriptionServiceType[]).forEach((type) => {
        if (activeSubscriptionServiceMap[type]) {
          this.webRunnerSubscription.restartService(type);
        }
      });

      this.webRunnerSubscription.getActiveServiceMapSubject().next(this.webRunnerSubscription.getActiveServiceMap());
    }
  };

  // checkApiStatus

  private checkStatusApiMap = () => {
    const apiMap = this.state.getApiMap();
    const networkMap = this.state.getNetworkMap();

    for (const [key, apiProp] of Object.entries(apiMap.dotSama)) {
      if (apiProp.isEthereumOnly) {
        continue;
      }

      let status: NETWORK_STATUS = NETWORK_STATUS.CONNECTING;

      if (apiProp.isApiConnected) {
        status = NETWORK_STATUS.CONNECTED;
      }

      if (!networkMap[key].apiStatus) {
        this.state.updateNetworkStatus(key, status);
      } else if (networkMap[key].apiStatus && networkMap[key].apiStatus !== status) {
        this.state.updateNetworkStatus(key, status);
      }
    }

    for (const [key, web3] of Object.entries(apiMap.web3)) {
      web3.eth.net.isListening()
        .then(() => {
          if (!networkMap[key].apiStatus) {
            this.state.updateNetworkStatus(key, NETWORK_STATUS.CONNECTED);
          } else if (networkMap[key].apiStatus && networkMap[key].apiStatus !== NETWORK_STATUS.CONNECTED) {
            this.state.updateNetworkStatus(key, NETWORK_STATUS.CONNECTED);
          }
        })
        .catch(() => {
          if (!networkMap[key].apiStatus) {
            this.state.updateNetworkStatus(key, NETWORK_STATUS.CONNECTING);
          } else if (networkMap[key].apiStatus && networkMap[key].apiStatus !== NETWORK_STATUS.CONNECTING) {
            this.state.updateNetworkStatus(key, NETWORK_STATUS.CONNECTING);
          }
        });
    }
  };

  private getActiveContractSupportedNetworks = (networkMap: Record<string, NetworkJson>): Record<string, NetworkJson> => {
    const contractSupportedNetworkMap: Record<string, NetworkJson> = {};

    Object.entries(networkMap).forEach(([key, network]) => {
      if (network.active && network.supportSmartContract && network.supportSmartContract.length > 0) {
        contractSupportedNetworkMap[key] = network;
      }
    });

    return contractSupportedNetworkMap;
  };

  private addCron = (name: CronType, callback: () => void, interval: number, runFirst = true) => {
    if (runFirst) {
      callback();
    }

    this.cronMap[name] = setInterval(callback, interval);
  };

  private removeCron = (name: CronType) => {
    const interval = this.cronMap[name];

    if (interval) {
      clearInterval(interval);
      this.cronMap[name] = undefined;
    }
  };

  private onStartService = (
    type: CronServiceType,
    onGetCurrentAccount?: (currentAccountInfo: CurrentAccountInfo) => void,
    onSubscribeServiceInfo?: (serviceInfo: ServiceInfo) => void): void => {
    if (onGetCurrentAccount) {
      this.state.getCurrentAccount((currentAccountInfo) => {
        if (!currentAccountInfo?.address) {
          return;
        }

        onGetCurrentAccount(currentAccountInfo);
      });
    }

    if (onSubscribeServiceInfo) {
      this.serviceInfoSubscriptionMap[type] = this.state.subscribeServiceInfo().subscribe({
        next: (serviceInfo) => {
          onSubscribeServiceInfo(serviceInfo);
        }
      });
    }
  };

  public init = (intervalMap: Partial<Record<CronType, number>>, activeServices: CronServiceType[], isEmitActiveServiceMap?: boolean) => {
    Object.assign(this.intervalMap, intervalMap);

    if (activeServices.length) {
      activeServices.forEach((type) => {
        if (!this.activeServiceMap[type]) {
          this.startService(type);
        }
      });
    }

    if (isEmitActiveServiceMap) {
      this.activeServiceMapSubject.next(this.activeServiceMap);
    }
  };

  public getActiveServiceMap = () => {
    return this.activeServiceMap;
  };

  public getActiveServiceMapSubject = (): Subject<Record<CronServiceType, boolean>> => {
    return this.activeServiceMapSubject;
  };

  public startService = (type: CronServiceType, isEmitActiveServiceMap?: boolean): void => {
    if (this.activeServiceMap[type]) {
      this.logger.log(`Ignore startService, cron service "${type}" is active`);

      return;
    }

    if (type === 'price') {
      this.onStartService(type,
        () => {
          this.addCron('refreshPrice', this.refreshPrice, this.intervalMap.refreshPrice);
        },
        () => {
          this.removeCron('refreshPrice');
          this.addCron('refreshPrice', this.refreshPrice, this.intervalMap.refreshPrice);
        }
      );
    } else if (type === 'nft') {
      this.onStartService(type,
        (currentAccountInfo) => {
          this.resetNft(currentAccountInfo.address);
          this.addCron('refreshNft',
            this.refreshNft(currentAccountInfo.address,
              this.state.getApiMap(),
              this.state.getActiveNftContracts(),
              this.state.getActiveContractSupportedNetworks()),
            this.intervalMap.refreshNft);
        },
        (serviceInfo) => {
          const { address } = serviceInfo.currentAccountInfo;

          this.resetNft(address);
          this.resetNftTransferMeta();
          this.removeCron('refreshNft');
          this.addCron('refreshNft',
            this.refreshNft(address,
              serviceInfo.apiMap,
              serviceInfo.customNftRegistry,
              this.getActiveContractSupportedNetworks(serviceInfo.networkMap)),
            this.intervalMap.refreshNft);
        }
      );
    } else if (type === 'staking') {
      this.onStartService(type,
        (currentAccountInfo) => {
          this.resetStakingReward();

          this.addCron('refreshStakingReward',
            this.refreshStakingReward(currentAccountInfo.address),
            this.intervalMap.refreshStakingReward);
          this.addCron('refreshStakeUnlockingInfo',
            this.refreshStakeUnlockingInfo(
              currentAccountInfo.address,
              this.state.getNetworkMap(),
              this.state.getDotSamaApiMap()),
            this.intervalMap.refreshStakeUnlockingInfo);
          this.addCron('refreshPoolingStakingReward',
            this.refreshStakingRewardFastInterval(currentAccountInfo.address),
            this.intervalMap.refreshPoolingStakingReward);
        },
        (serviceInfo) => {
          const { address } = serviceInfo.currentAccountInfo;

          this.removeCron('refreshStakeUnlockingInfo');
          this.removeCron('refreshStakingReward');
          this.removeCron('refreshPoolingStakingReward');

          this.resetStakingReward();

          this.addCron('refreshStakingReward',
            this.refreshStakingReward(address),
            this.intervalMap.refreshStakingReward);
          this.addCron('refreshStakeUnlockingInfo',
            this.refreshStakeUnlockingInfo(address, serviceInfo.networkMap, serviceInfo.apiMap.dotSama),
            this.intervalMap.refreshStakeUnlockingInfo);
          this.addCron('refreshPoolingStakingReward',
            this.refreshStakingRewardFastInterval(address),
            this.intervalMap.refreshPoolingStakingReward);
        }
      );
    } else if (type === 'recoverApi') {
      this.addCron('recoverApiMap', this.recoverApiMap, this.intervalMap.recoverApiMap, false);
    } else if (type === 'checkApiStatus') {
      this.addCron('checkApiMapStatus', this.checkStatusApiMap, this.intervalMap.checkApiMapStatus);
    } else if (type === 'history') {
      this.onStartService(type,
        (currentAccountInfo) => {
          this.resetHistory(currentAccountInfo.address).then(() => {
            this.addCron('refreshHistory',
              this.refreshHistory2(currentAccountInfo.address),
              this.intervalMap.refreshHistory);
          }).catch(this.logger.warn);
        },
        (serviceInfo) => {
          const { address } = serviceInfo.currentAccountInfo;

          this.removeCron('refreshHistory');

          this.resetHistory(address).then(() => {
            this.addCron('refreshHistory',
              this.refreshHistory2(address),
              this.intervalMap.refreshHistory);
          }).catch((err) => this.logger.warn(err));
        }
      );
    }

    this.activeServiceMap[type] = true;

    if (isEmitActiveServiceMap) {
      this.activeServiceMapSubject.next(this.activeServiceMap);
    }
  };

  public stopService = (serviceType: CronServiceType, isEmitActiveServiceMap?: boolean) => {
    if (!this.activeServiceMap[serviceType]) {
      this.logger.log(`Ignore stopService, cron service "${serviceType}" is not active`);

      return;
    }

    if (this.serviceInfoSubscriptionMap[serviceType]) {
      this.serviceInfoSubscriptionMap[serviceType]?.unsubscribe();
      this.serviceInfoSubscriptionMap[serviceType] = undefined;
    }

    cronServiceRelationMap[serviceType].forEach((cronType) => {
      this.removeCron(cronType);
    });

    this.activeServiceMap[serviceType] = false;

    if (isEmitActiveServiceMap) {
      this.activeServiceMapSubject.next(this.activeServiceMap);
    }
  };

  public restartService = (type: CronServiceType, isEmitActiveServiceMap?: boolean) => {
    if (!this.activeServiceMap[type]) {
      this.logger.log(`Ignore restartService, cron service "${type}" is not active`);

      return;
    }

    this.stopService(type);
    this.startService(type);

    if (isEmitActiveServiceMap) {
      this.activeServiceMapSubject.next(this.activeServiceMap);
    }
  };
}
