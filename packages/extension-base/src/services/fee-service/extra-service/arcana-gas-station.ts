// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { SCW } from '@arcana/scw';

export class ArcanaGasStation {
  private scw: SCW;

  constructor () {
    this.scw = new SCW();
    console.log(this.scw);
  }

  public async init () {
    await this.scw.init(
      process.env.ARCANA_CLIENT_ID as string,
      window.ethereum,
      undefined,
      0
    );

    console.log(this.scw);
    const resp = this.scw.getSCWAddress();
    console.log(resp);
  }
}
