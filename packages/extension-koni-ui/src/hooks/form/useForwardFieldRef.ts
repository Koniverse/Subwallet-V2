// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { InputRef } from '@subwallet/react-ui';
import { ForwardedRef, RefObject, useEffect, useRef } from 'react';

export function useForwardFieldRef<T = InputRef> (ref: ForwardedRef<T>): RefObject<T> {
  const fieldRef = useRef<T>(null);

  useEffect(() => {
    if (typeof ref === 'function') {
      ref(fieldRef.current);
    }
  }, [ref]);

  return fieldRef;
}
