// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import KoniState from '@subwallet/extension-base/koni/background/handlers/State';
import { _isChainEvmCompatible } from '@subwallet/extension-base/services/chain-service/utils';
import { calculateGasFeeParams } from '@subwallet/extension-base/services/fee-service/utils';
import { EvmFeeInfo, FeeChainType, FeeInfo, FeeSubscription } from '@subwallet/extension-base/types';
import { BehaviorSubject } from 'rxjs';

export default class FeeService {
  protected readonly state: KoniState;

  private evmFeeSubject: BehaviorSubject<Record<string, EvmFeeInfo>> = new BehaviorSubject<Record<string, EvmFeeInfo>>({});
  private useInfura: boolean;

  private chainFeeSubscriptionMap: Record<FeeChainType, Record<string, FeeSubscription>> = {
    evm: {},
    substrate: {}
  };

  constructor (state: KoniState) {
    this.state = state;
    this.useInfura = true;
  }

  public changeMode (useInfura: boolean) {
    this.useInfura = useInfura;
  }

  private async updateFees () {
    await this.state.eventService.waitChainReady;
    const activeNetworks = this.state.activeNetworks;
    const chains = Object.values(activeNetworks).filter((chainInfo) => _isChainEvmCompatible(chainInfo)).map((chainInfo) => chainInfo.slug);

    const promises: Promise<void>[] = [];

    for (const chain of chains) {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises,no-async-promise-executor
      const promise = new Promise<void>(async (resolve) => {
        const api = this.state.getEvmApi(chain);
        const result = await calculateGasFeeParams(api, chain, this.useInfura);

        this.updateChainFee(chain, result);

        resolve();
      });

      promises.push(promise);
    }

    await Promise.all(promises);
  }

  private updateChainFee (chain: string, info: EvmFeeInfo) {
    const rs: Record<string, EvmFeeInfo> = Object.assign({}, this.evmFeeSubject.getValue());

    rs[chain] = info;

    this.evmFeeSubject.next(rs);
  }

  public subscribeFees (callback: (data: Record<string, EvmFeeInfo>) => void) {
    let cancel = false;

    const fetchData = () => {
      this.updateFees().finally(() => {
        if (!cancel) {
          callback(this.evmFeeSubject.getValue());
        }
      });
    };

    fetchData();

    const interval = setInterval(() => {
      if (cancel) {
        clearInterval(interval);
      } else {
        fetchData();
      }
    }, 30 * 1000);

    return () => {
      cancel = true;
      clearInterval(interval);
    };
  }

  public subscribeChainFee (id: string, chain: string, type: FeeChainType, callback?: (data: FeeInfo) => void) {
    return new Promise<FeeInfo>((resolve) => {
      const _callback = (value: FeeInfo | undefined) => {
        console.log(id, this.chainFeeSubscriptionMap);

        if (value) {
          callback?.(value);
          resolve(value);
        }
      };

      const feeSubscription = this.chainFeeSubscriptionMap[type][chain];

      if (feeSubscription) {
        const observer = feeSubscription.observer;

        _callback(observer.getValue());

        // If have callback, just subscribe
        if (callback) {
          const subscription = observer.subscribe({
            next: _callback
          });

          this.chainFeeSubscriptionMap[type][chain].subscription[id] = () => {
            if (!subscription.closed) {
              subscription.unsubscribe();
            }
          };
        }
      } else {
        const observer = new BehaviorSubject<FeeInfo | undefined>(undefined);

        const subscription = observer.subscribe({
          next: _callback
        });

        let cancel = false;
        let interval: NodeJS.Timer;

        const update = () => {
          if (cancel) {
            clearInterval(interval);
          } else {
            const api = this.state.getEvmApi(chain);

            if (api) {
              calculateGasFeeParams(api, chain)
                .then((info) => {
                  observer.next(info);
                })
                .catch(console.error);
            } else {
              observer.next({
                type: 'substrate',
                busyNetwork: false,
                options: {
                  slow: {
                    tip: '0'
                  },
                  average: {
                    tip: '0'
                  },
                  fast: {
                    tip: '0'
                  },
                  default: 'slow'
                }
              });
              clearInterval(interval);
            }
          }
        };

        update();

        // If have callback, just subscribe
        if (callback) {
          interval = setInterval(update, 15 * 1000);

          const unsub = () => {
            cancel = true;
            observer.complete();
            clearInterval(interval);
          };

          this.chainFeeSubscriptionMap[type][chain] = {
            observer,
            subscription: {
              [id]: () => {
                if (!subscription.closed) {
                  subscription.unsubscribe();
                }
              }
            },
            unsubscribe: unsub
          };
        }
      }
    });
  }

  public unsubscribeChainFee (id: string, chain: string, type: FeeChainType) {
    const subscription = this.chainFeeSubscriptionMap[type][chain];

    if (subscription) {
      const unsub = subscription.subscription[id];

      unsub && unsub();
      delete subscription.subscription[id];

      if (Object.keys(subscription.subscription).length === 0) {
        subscription.unsubscribe();
        delete this.chainFeeSubscriptionMap[type][chain];
      }
    }
  }
}
