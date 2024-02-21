// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ChainService } from '@subwallet/extension-base/services/chain-service';
import { subscribeHeader, validateProof } from '@subwallet/extension-base/services/da-service/avail';
import { Block, Cell, Matrix } from '@subwallet/extension-base/services/da-service/types';
import { AVAIL_DEFAULT_NETWORK } from '@subwallet/extension-base/services/da-service/utils';
import init from 'wasm-avail-light';

export class DaService {
  private chainService: ChainService;
  private _currentBlock: Block = { number: 0, hash: '', totalCellCount: 0, confidence: null, sampleCount: 0, timestamp: 0 };
  private _currentMatrix: Matrix = { maxCol: 0, maxRow: 0, totalCellCount: 0, verifiedCells: [] };
  private _unsub: (() => void) | undefined;

  constructor (chainService: ChainService) {
    this.chainService = chainService;
  }

  public get currentBlock () {
    return this._currentBlock;
  }

  public get currentMatrix () {
    return this._currentMatrix;
  }

  public get unsub () {
    return this._unsub;
  }

  public async init () {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await init();
  }

  public async subscribeAvailHeader () {
    const substrateApi = this.chainService.getSubstrateApi(AVAIL_DEFAULT_NETWORK);

    if (substrateApi) {
      this._unsub = await subscribeHeader(substrateApi, (block: Block, matrix: Matrix, randomCells: Cell[], proofs: Uint8Array[], commitments: Uint8Array[]) => {
        console.log('ok');
      });
    } else {
      console.log('substrateApi is not found');
    }
  }

  public validateProof (block: Block, matrix: Matrix, randomCells: Cell[], proofs: Uint8Array[], commitments: Uint8Array[]) {
    return validateProof(block, matrix, randomCells, proofs, commitments);
  }
}
