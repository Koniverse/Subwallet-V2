// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

export type Cell = {
  row: number,
  col: number
}

export interface Block {
  number: number,
  hash: string,
  totalCellCount: number,
  confidence: number | null,
  sampleCount: number,
  timestamp: number
}

export type Matrix = {
  maxRow: number,
  maxCol: number,
  verifiedCells: Cell[],
  totalCellCount: number,
}

export interface BlockExtension {
  v1: {
    appLookup: {
      size: number,
      index: unknown[]
    },
    commitment: {
      rows: number,
      cols: number,
      commitment: string, // hex string
      dataRoot: string // hex string
    }
  }
}

export interface BlockHeader {
  number: number,
  parentHash: string,
  stateRoot: string,
  extrinsicsRoot: string,
  digest: Record<string, unknown>,
  extension: BlockExtension
}
