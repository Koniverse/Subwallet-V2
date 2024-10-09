// Copyright 2019-2022 @polkadot/extension-bg authors & contributors
// SPDX-License-Identifier: Apache-2.0

export interface Resolver<T> {
  reject: (error: Error) => void;
  resolve: (result: T) => void;
}
