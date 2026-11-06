/* tslint:disable */
/* eslint-disable */

/**
 * Spaced-repetition session over one alg set. Progress is (de)serialized as
 * JSON so the frontend can persist it in localStorage.
 */
export class Trainer {
    free(): void;
    [Symbol.dispose](): void;
    cases(): any;
    /**
     * Cube state showing the current case (alg inverse applied to solved).
     */
    currentState(): any;
    current(): any;
    exportProgress(): string;
    /**
     * 0 = Again, 1 = Hard, 2 = Good, 3 = Easy
     */
    grade(grade: number, now: number): void;
    constructor(set_id: string, saved_json?: string | null);
    /**
     * Advance to the next case. Returns the case index.
     */
    next(now: number): number;
    resetProgress(): void;
    /**
     * Select a specific case (from the case list).
     */
    select(index: number): void;
    setDescription(): string;
    setName(): string;
    stats(now: number): any;
}

export function invertAlgorithm(alg: string): string;

export function listSets(): any;

/**
 * Apply an alg (face turns only) to a solved cube; used for the free-practice box.
 */
export function stateAfter(alg: string): any;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_trainer_free: (a: number, b: number) => void;
    readonly invertAlgorithm: (a: number, b: number) => [number, number, number, number];
    readonly listSets: () => any;
    readonly stateAfter: (a: number, b: number) => [number, number, number];
    readonly trainer_cases: (a: number) => any;
    readonly trainer_current: (a: number) => any;
    readonly trainer_currentState: (a: number) => [number, number, number];
    readonly trainer_exportProgress: (a: number) => [number, number];
    readonly trainer_grade: (a: number, b: number, c: number) => [number, number];
    readonly trainer_new: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly trainer_next: (a: number, b: number) => number;
    readonly trainer_resetProgress: (a: number) => void;
    readonly trainer_select: (a: number, b: number) => void;
    readonly trainer_setDescription: (a: number) => [number, number];
    readonly trainer_setName: (a: number) => [number, number];
    readonly trainer_stats: (a: number, b: number) => any;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
