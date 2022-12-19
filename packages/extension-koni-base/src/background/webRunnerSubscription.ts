// Copyright 2019-2022 @subwallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ApiProps, CurrentAccountInfo, ServiceInfo, SubscriptionServiceType } from '@subwallet/extension-base/background/KoniTypes';
import { subscribeBalance } from '@subwallet/extension-koni-base/api/dotsama/balance';
import { subscribeCrowdloan } from '@subwallet/extension-koni-base/api/dotsama/crowdloan';
import { stakingOnChainApi } from '@subwallet/extension-koni-base/api/staking';
import KoniState from '@subwallet/extension-koni-base/background/handlers/State';
import { Subject, Subscription } from 'rxjs';
import Web3 from 'web3';

import { logger as createLogger } from '@polkadot/util/logger';
import { Logger } from '@polkadot/util/types';

export default class WebRunnerSubscription {
  private readonly activeServiceMap: Record<SubscriptionServiceType, boolean>;
  private readonly serviceInfoSubscriptionMap: Record<SubscriptionServiceType, Subscription | undefined>;
  private readonly unsubscriptionMap: Record<SubscriptionServiceType, (() => void) | undefined>;
  private readonly activeServiceMapSubject: Subject<Record<SubscriptionServiceType, boolean>>;
  private state: KoniState;
  private logger: Logger;

  constructor (state: KoniState) {
    this.state = state;
    this.activeServiceMapSubject = new Subject<Record<SubscriptionServiceType, boolean>>();
    this.logger = createLogger('WebRunnerSubscription');
    this.unsubscriptionMap = {
      chainRegistry: undefined,
      balance: undefined,
      crowdloan: undefined,
      staking: undefined
    };
    this.activeServiceMap = {
      chainRegistry: false,
      balance: false,
      crowdloan: false,
      staking: false
    };
    this.serviceInfoSubscriptionMap = {
      chainRegistry: undefined,
      balance: undefined,
      crowdloan: undefined,
      staking: undefined
    };
  }

  private updateSubscription = (type: SubscriptionServiceType, func: (() => void) | undefined) => {
    const unsub = this.unsubscriptionMap[type];

    unsub && unsub();
    this.unsubscriptionMap[type] = func;
  };

  // balance

  private initBalanceSubscription = (
    addresses: string[],
    dotSamaApiMap: Record<string, ApiProps>,
    web3ApiMap: Record<string, Web3>,
    onlyRunOnFirstTime?: boolean) => {
    const unsub = subscribeBalance(addresses, dotSamaApiMap, web3ApiMap, (networkKey, rs) => {
      this.state.setBalanceItem(networkKey, rs);
    });

    if (onlyRunOnFirstTime) {
      unsub && unsub();

      return;
    }

    return () => {
      unsub && unsub();
    };
  };

  private subscribeBalances = (
    address: string,
    dotSamaApiMap: Record<string, ApiProps>,
    web3ApiMap: Record<string, Web3>,
    onlyRunOnFirstTime?: boolean) => {
    this.state.resetBalanceMap(address).then(() => {
      this.state.getDecodedAddresses(address)
        .then((addresses) => {
          if (!addresses.length) {
            return;
          }

          this.updateSubscription('balance', this.initBalanceSubscription(addresses, dotSamaApiMap, web3ApiMap, onlyRunOnFirstTime));
        })
        .catch(this.logger.warn);
    }).catch(this.logger.warn);
  };

  // crowdloan

  private initCrowdloanSubscription = (addresses: string[], dotSamaApiMap: Record<string, ApiProps>, onlyRunOnFirstTime?: boolean) => {
    const subscriptionPromise = subscribeCrowdloan(addresses, dotSamaApiMap, (networkKey, rs) => {
      this.state.setCrowdloanItem(networkKey, rs);
    });

    if (onlyRunOnFirstTime) {
      subscriptionPromise.then((unsub) => unsub()).catch(this.logger.warn);

      return;
    }

    return () => {
      subscriptionPromise.then((unsub) => unsub()).catch(this.logger.warn);
    };
  };

  private subscribeCrowdloans = (address: string, dotSamaApiMap: Record<string, ApiProps>, onlyRunOnFirstTime?: boolean) => {
    this.state.resetCrowdloanMap(address).then(() => {
      this.state.getDecodedAddresses(address)
        .then((addresses) => {
          if (!addresses.length) {
            return;
          }

          this.updateSubscription('crowdloan', this.initCrowdloanSubscription(addresses, dotSamaApiMap, onlyRunOnFirstTime));
        })
        .catch(this.logger.warn);
    }).catch(this.logger.warn);
  };

  // staking

  private initStakingOnChainSubscription = (addresses: string[], dotSamaApiMap: Record<string, ApiProps>, onlyRunOnFirstTime?: boolean) => {
    const unsub = stakingOnChainApi(addresses, dotSamaApiMap, (networkKey, rs) => {
      this.state.setStakingItem(networkKey, rs);
    }, this.state.getNetworkMap());

    if (onlyRunOnFirstTime) {
      unsub && unsub();

      return;
    }

    return () => {
      unsub && unsub();
    };
  };

  private subscribeStakingOnChain = (address: string, dotSamaApiMap: Record<string, ApiProps>, onlyRunOnFirstTime?: boolean) => {
    this.state.resetStaking(address).then(() => {
      this.state.getDecodedAddresses(address)
        .then((addresses) => {
          if (!addresses.length) {
            return;
          }

          this.updateSubscription('staking', this.initStakingOnChainSubscription(addresses, dotSamaApiMap, onlyRunOnFirstTime));
        })
        .catch(this.logger.warn);
    }).catch(this.logger.warn);
  };

  private onStartService = (
    type: SubscriptionServiceType,
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

  public init = (activeServices: SubscriptionServiceType[], isEmitActiveServiceMap?: boolean) => {
    if (activeServices && activeServices.length) {
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

  public getActiveServiceMapSubject = (): Subject<Record<SubscriptionServiceType, boolean>> => {
    return this.activeServiceMapSubject;
  };

  public startService = (type: SubscriptionServiceType, isEmitActiveServiceMap?: boolean) => {
    if (this.activeServiceMap[type]) {
      this.logger.log(`Ignore startService, subscription service "${type}" is active`);

      return;
    }

    if (type === 'chainRegistry') {
      this.onStartService(type, undefined, () => {
        this.state.initChainRegistry();
      });
    } else if (type === 'balance') {
      this.onStartService(type, (currentAccountInfo) => {
        this.subscribeBalances(currentAccountInfo.address, this.state.getDotSamaApiMap(), this.state.getWeb3ApiMap());
      }, (serviceInfo) => {
        this.subscribeBalances(serviceInfo.currentAccountInfo.address, serviceInfo.apiMap.dotSama, serviceInfo.apiMap.web3);
      });
    } else if (type === 'crowdloan') {
      this.onStartService(type, (currentAccountInfo) => {
        this.subscribeCrowdloans(currentAccountInfo.address, this.state.getDotSamaApiMap());
      }, (serviceInfo) => {
        this.subscribeCrowdloans(serviceInfo.currentAccountInfo.address, serviceInfo.apiMap.dotSama);
      });
    } else if (type === 'staking') {
      this.onStartService(type, (currentAccountInfo) => {
        this.subscribeStakingOnChain(currentAccountInfo.address, this.state.getDotSamaApiMap());
      }, (serviceInfo) => {
        this.subscribeStakingOnChain(serviceInfo.currentAccountInfo.address, serviceInfo.apiMap.dotSama);
      });
    }

    this.activeServiceMap[type] = true;

    if (isEmitActiveServiceMap) {
      this.activeServiceMapSubject.next(this.activeServiceMap);
    }
  };

  public stopService = (type: SubscriptionServiceType, isEmitActiveServiceMap?: boolean) => {
    if (!this.activeServiceMap[type]) {
      this.logger.log(`Ignore stopService, subscription service "${type}" is not active`);

      return;
    }

    if (this.serviceInfoSubscriptionMap[type]) {
      this.serviceInfoSubscriptionMap[type]?.unsubscribe();
      this.serviceInfoSubscriptionMap[type] = undefined;
    }

    const unsub = this.unsubscriptionMap[type];

    unsub && unsub();

    this.activeServiceMap[type] = false;

    if (isEmitActiveServiceMap) {
      this.activeServiceMapSubject.next(this.activeServiceMap);
    }
  };

  public restartService = (type: SubscriptionServiceType, isEmitActiveServiceMap?: boolean) => {
    if (!this.activeServiceMap[type]) {
      this.logger.log(`Ignore restartService, subscription service "${type}" is not active`);

      return;
    }

    this.stopService(type);
    this.startService(type);

    if (isEmitActiveServiceMap) {
      this.activeServiceMapSubject.next(this.activeServiceMap);
    }
  };
}
