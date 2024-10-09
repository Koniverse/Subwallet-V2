// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import SubscribableStore from '@subwallet/extension-base/stores/SubscribableStore';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';

export interface IStoreSubject<T> {
  subscribe(callback: (data: T) => void): Subscription;
  init(): void;
  get value(): T;
  get observable(): Observable<T>;
  get countObservers(): number;
}

export abstract class StoreSubject<T> implements IStoreSubject<T> {
  abstract store: SubscribableStore<T>;
  abstract subject: BehaviorSubject<T>;
  abstract key: string;
  abstract defaultValue: T;

  transformInitData (data: T): T {
    return data ?? this.defaultValue;
  }

  init () {
    this.store.get(this.key, (rs) => {
      const data = this.transformInitData(rs);

      this.subject.next(data);
    });
  }

  get value (): T {
    return this.subject.value;
  }

  get observable (): Observable<T> {
    return this.subject.asObservable();
  }

  get countObservers (): number {
    return this.subject.observers.length;
  }

  upsertData (data: T, callback?: (data: T) => void) {
    this.store.set(this.key, data);
    this.subject.next(data);
  }

  subscribe (callback: (data: T) => void) {
    return this.subject.subscribe(callback);
  }
}
