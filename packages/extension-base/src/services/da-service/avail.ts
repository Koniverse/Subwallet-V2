// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _SubstrateApi } from '@subwallet/extension-base/services/chain-service/types';
import { Block, BlockHeader, Cell, Matrix } from '@subwallet/extension-base/services/da-service/types';
import { AVAIL_CONFIG, generateRandomCells } from '@subwallet/extension-base/services/da-service/utils';
import { check } from 'wasm-avail-light';

export async function subscribeHeader (substrateApi: _SubstrateApi, callback: (block: Block, matrix: Matrix, randomCells: Cell[], proofs: Uint8Array[], commitments: Uint8Array[]) => void) {
  const chainApi = await substrateApi.isReady;

  return chainApi.api.rpc.chain.subscribeFinalizedHeads(async (_header: any) => {
    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
    const header = _header.toPrimitive() as BlockHeader;

    const blockNumber = header.number;
    const extension = header.extension;

    const commitment = extension.v1.commitment;
    const _kateCommitment = commitment.commitment.split('0x')[1].toUpperCase();
    const r = commitment.rows;
    const c = commitment.cols;
    const timestamp = Date.now();

    // fetching block hash from number
    const blockHash = (await chainApi.api.rpc.chain.getBlockHash(header.number)).toString();

    console.log(`New Block with hash: ${blockHash}, Number: ${blockNumber} `);
    console.log('Commitment: ', commitment);

    // Generating SAMPLE_SIZE random cell for sampling
    const totalCellCount = (r * AVAIL_CONFIG.EXTENSION_FACTOR) * c;
    let sampleCount = AVAIL_CONFIG.SAMPLE_SIZE;

    if (sampleCount >= totalCellCount) {
      sampleCount = 5;
    }

    const randomCells = generateRandomCells(r, c, sampleCount);

    console.log('Random cells: ', randomCells);

    // Query data proof for sample 0,0
    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
    const _kateProof = await chainApi.api.rpc.kate.queryProof(randomCells, blockHash);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const kateProof = Uint8Array.from(_kateProof);
    const parsedKateProof = _kateCommitment.match(/.{1,2}/g)?.map((byte: string) => parseInt(byte, 16)) || [];
    const kateCommitment = Uint8Array.from(parsedKateProof);

    // Creating commitment array based on rows and proof array based on cells
    const commitments: Uint8Array[] = [];

    for (let i = 0; i < (r * AVAIL_CONFIG.EXTENSION_FACTOR); i++) {
      commitments.push(kateCommitment.slice(i * AVAIL_CONFIG.COMMITMENT_SIZE, (i + 1) * AVAIL_CONFIG.COMMITMENT_SIZE));
    }

    const proofs: Uint8Array[] = [];

    for (let i = 0; i < AVAIL_CONFIG.SAMPLE_SIZE; i++) {
      proofs.push(kateProof.slice(i * AVAIL_CONFIG.KATE_PROOF_SIZE, (i + 1) * AVAIL_CONFIG.KATE_PROOF_SIZE));
    }

    // Create required info for process block
    const block: Block = { number: blockNumber, hash: blockHash, totalCellCount: totalCellCount, confidence: 0, sampleCount: sampleCount, timestamp };
    const matrix: Matrix = { maxRow: r, maxCol: c, verifiedCells: [], totalCellCount };

    callback(block, matrix, randomCells, proofs, commitments);
  });
}

export function validateProof (block: Block, matrix: Matrix, cells: Cell[], proofs: Uint8Array[], commitments: Uint8Array[]) {
  let verifiedCount = 0;
  const verifiedCells: Cell[] = [];

  for (let i = 0; i < cells.length; i++) {
    // if (block.number < (latestBlock?.number || 0)) {
    //   return;
    // }

    const cell = cells[i];

    const isVerified = check(
      proofs[i],
      commitments[cell.row],
      matrix.maxCol,
      cell.row,
      cell.col
    );

    if (isVerified) {
      verifiedCount++;
      const confidence = 100 * (1 - 1 / Math.pow(2, verifiedCount));

      verifiedCells.push(cell);

      console.log('Confidence: ', confidence);

      // setLatestBlock({
      //   hash: block.hash,
      //   number: block.number,
      //   totalCellCount: block.totalCellCount,
      //   confidence: confidence,
      //   sampleCount: block.sampleCount,
      //   timestamp: block.timestamp
      // });
      //
      // setMatrix({
      //   maxRow: matrix.maxRow,
      //   maxCol: matrix.maxCol,
      //   //@ts-ignore
      //   verifiedCells,
      //   totalCellCount: matrix.totalCellCount,
      // });
    }
  }

  console.log('verifiedCells', verifiedCells);
  console.log('verifiedCount', verifiedCount);
}
