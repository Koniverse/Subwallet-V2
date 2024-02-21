/* tslint:disable */
/* eslint-disable */
/**
* @param {Uint8Array} proof
* @param {Uint8Array} commitment
* @param {number} width
* @param {number} row
* @param {number} col
* @returns {boolean}
*/
export function check(proof: Uint8Array, commitment: Uint8Array, width: number, row: number, col: number): boolean;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly check: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => number;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {SyncInitInput} module
*
* @returns {InitOutput}
*/
export function initSync(module: SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
