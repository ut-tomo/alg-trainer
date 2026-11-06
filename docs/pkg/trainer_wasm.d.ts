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

/**
 * Apply physical notation to a given state.
 */
export function applyTo(state: any, alg: string): any;

export function invertAlgorithm(alg: string): string;

/**
 * Whether a state (e.g. painted on the net) is reachable from solved.
 */
export function isLegal(state: any): boolean;

export function listSets(): any;

/**
 * Map an alg written for front = F to front k (0 F, 1 R, 2 B, 3 L).
 */
export function mapFront(alg: string, k: number): string;

/**
 * Apply an alg (face turns only) to a solved cube; used for the free-practice box.
 */
export function stateAfter(alg: string): any;

/**
 * Current stage and the operations to the next milestone.
 */
export function takahashiSuggest(state: any, style: string): any;

/**
 * Operation templates (front-relative) for the palette.
 */
export function takahashiTemplates(style: string): any;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_trainer_free: (a: number, b: number) => void;
    readonly applyTo: (a: any, b: number, c: number) => [number, number, number];
    readonly invertAlgorithm: (a: number, b: number) => [number, number, number, number];
    readonly isLegal: (a: any) => [number, number, number];
    readonly listSets: () => any;
    readonly mapFront: (a: number, b: number, c: number) => [number, number, number, number];
    readonly stateAfter: (a: number, b: number) => [number, number, number];
    readonly takahashiSuggest: (a: any, b: number, c: number) => [number, number, number];
    readonly takahashiTemplates: (a: number, b: number) => any;
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
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
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
