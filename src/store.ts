import { createEventBus, EventBusDefinitionHelper } from "./eventBus.js";
import type {
    ApiType,
    ErrorListenerSignature,
    KeyOf,
    MapKey,
} from "./lib/types.js";

export interface BasePropMap {
    [key: MapKey]: any;
}

export const BeforeChangeEventName = "before";
export const ChangeEventName = "change";
export const ResetEventName = "reset";
export const ErrorEventName = "error";
export const EffectEventName = "effect";

type StoreControlEvents<PropMap extends BasePropMap> = {
    [BeforeChangeEventName]: <K extends KeyOf<PropMap>, V extends PropMap[K]>(
        name: K,
        value: V | undefined,
    ) => boolean;
    [ChangeEventName]: (names: KeyOf<PropMap>[]) => void;
    [ResetEventName]: () => void;
    [ErrorEventName]: ErrorListenerSignature<any[]>;
    [EffectEventName]: <K extends KeyOf<PropMap>, V extends PropMap[K]>(
        name: K,
        value: V | undefined,
    ) => void;
};

type StoreChangeEvents<PropMap extends BasePropMap> = {
    [K in KeyOf<PropMap>]: (
        value: PropMap[K] | undefined,
        previousValue?: PropMap[K] | undefined,
    ) => void;
};

type StorePipeEvents<PropMap extends BasePropMap> = {
    [K in KeyOf<PropMap>]: (value: PropMap[K] | undefined) => PropMap[K];
};

export type StoreDefinitionHelper<
    PropMap extends BasePropMap,
> = {
    propTypes: PropMap;
    controlEvents: StoreControlEvents<PropMap>;
    changeEvents: StoreChangeEvents<PropMap>;
    pipeEvents: StorePipeEvents<PropMap>;
    changeEventBus: EventBusDefinitionHelper<
        StoreChangeEvents<PropMap>
    >;
    pipeEventBus: EventBusDefinitionHelper<
        StorePipeEvents<PropMap>
    >;
    controlEventBus: EventBusDefinitionHelper<
        StoreControlEvents<PropMap>
    >;
};

export function createStore<PropMap extends BasePropMap = BasePropMap>(
    initialData: Partial<PropMap> = {},
) {
    type Store = StoreDefinitionHelper<PropMap>;
    type PipeEvents = Store["pipeEventBus"]["events"];
    type ChangeEvents = Store["changeEventBus"]["events"];

    const data = new Map<KeyOf<PropMap>, any>(
        Object.entries(initialData),
    );
    const changes = createEventBus<Store["changeEvents"]>();
    const pipe = createEventBus<Store["pipeEvents"]>();
    const control = createEventBus<Store["controlEvents"]>();
    let effectKeys: KeyOf<PropMap>[] = [];

    // Computed keys are read-only via the public `set` and recompute via the
    // `effect` control event. `computingKeys` is a per-key re-entrancy guard so
    // a cyclic computed throws instead of looping forever.
    const computedKeys = new Set<KeyOf<PropMap>>();
    const computingKeys = new Set<KeyOf<PropMap>>();

    // Multi-key object sets write every base value first with effect emission
    // deferred (`deferEffects`), then replay effects once so computed values
    // recompute from the final state instead of once per intermediate write.
    // `computedBatch`, when active, records the dependency values each computed
    // last recomputed from in this batch. A computed is skipped only when its
    // deps are unchanged since then — so a redundant dep change is a no-op, but
    // a dependent in a computed chain still recomputes once its upstream
    // computed updates (rather than settling on a stale early value).
    let deferEffects = false;
    let computedBatch: Map<KeyOf<PropMap>, unknown[]> | null = null;

    const arraysShallowEqual = (
        a: readonly unknown[],
        b: readonly unknown[],
    ): boolean => {
        if (a.length !== b.length) {
            return false;
        }
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) {
                return false;
            }
        }
        return true;
    };

    let destroyed = false;
    // Timers scheduled by asyncSet, tracked so destroy() can cancel them.
    // Otherwise a pending callback fires after teardown and throws "Store is
    // destroyed" from inside the timer.
    const pendingTimers = new Set<ReturnType<typeof setTimeout>>();
    const assertAlive = () => {
        if (destroyed) {
            throw new Error("Store is destroyed");
        }
    };

    const dedupe = (keys: MapKey[]): MapKey[] => Array.from(new Set(keys));

    const effectInterceptor = (name: MapKey, args: unknown[]) => {
        if (name === ChangeEventName) {
            effectKeys.push(...(args[0] as KeyOf<PropMap>[]));
            return false;
        }
        // While the multi-key loop writes base values, swallow effect emissions;
        // they are replayed once afterwards against the final state.
        if (name === EffectEventName && deferEffects) {
            return false;
        }
        return true;
    };

    const _set = <K extends KeyOf<PropMap>, V extends PropMap[K]>(
        name: K,
        value: V | undefined,
        triggerChange: boolean = true,
    ) => {
        const prev = data.get(name) as V | undefined;
        if (prev !== value) {
            const beforeChangeResults = control.all(
                BeforeChangeEventName,
                name,
                value,
            );
            if (beforeChangeResults.some((result) => result === false)) {
                return;
            }

            const pipeArgs = [ value ] as PipeEvents[K]["arguments"];
            let newValue: any;
            try {
                newValue = pipe.pipe(name, ...pipeArgs);
            }
            catch (error) {
                control.trigger(ErrorEventName, {
                    error: error instanceof Error
                        ? error
                        : new Error(String(error)),
                    args: pipeArgs,
                    type: "store-pipe",
                    name,
                });
                if (control.get(ErrorEventName)?.hasListener()) {
                    return false;
                }
                throw error;
            }

            if (newValue !== undefined) {
                value = newValue;
            }

            data.set(name, value);

            const changeArgs = [
                value,
                prev,
            ] as unknown as ChangeEvents[K]["arguments"];
            try {
                changes.trigger(name, ...changeArgs);
            }
            catch (error) {
                control.trigger(ErrorEventName, {
                    error: error instanceof Error
                        ? error
                        : new Error(String(error)),
                    args: changeArgs,
                    type: "store-change",
                    name,
                });
                if (control.get(ErrorEventName)?.hasListener()) {
                    effectKeys = [];
                    return true;
                }
                throw error;
            }

            if (control.get(EffectEventName)?.hasListener()) {
                try {
                    const isIntercepting = control.isIntercepting();
                    try {
                        if (!isIntercepting) {
                            control.intercept(effectInterceptor);
                        }
                        control.trigger(EffectEventName, name, value);
                    }
                    finally {
                        if (!isIntercepting) {
                            control.stopIntercepting();
                        }
                    }
                }
                catch (error) {
                    control.trigger(ErrorEventName, {
                        error: error instanceof Error
                            ? error
                            : new Error(String(error)),
                        args: [ name ],
                        type: "store-control",
                        name,
                    });
                    if (control.get(ErrorEventName)?.hasListener()) {
                        effectKeys = [];
                        return true;
                    }
                    throw error;
                }
            }

            if (triggerChange) {
                try {
                    control.trigger(
                        ChangeEventName,
                        dedupe([ name, ...effectKeys ]),
                    );
                    if (!control.isIntercepting()) {
                        effectKeys = [];
                    }
                }
                catch (error) {
                    control.trigger(ErrorEventName, {
                        error: error instanceof Error
                            ? error
                            : new Error(String(error)),
                        args: [ name ],
                        type: "store-control",
                        name,
                    });
                    if (control.get(ErrorEventName)?.hasListener()) {
                        effectKeys = [];
                        return true;
                    }
                    throw error;
                }
            }
            return true;
        }
        return false;
    };

    function asyncSet<K extends KeyOf<PropMap>>(
        key: K,
        value: PropMap[K] | undefined,
    ): void;
    function asyncSet(key: Partial<PropMap>): void;
    function asyncSet<
        K extends (KeyOf<PropMap>) | Partial<PropMap>,
        V extends K extends (KeyOf<PropMap>) ? PropMap[K]
            : never,
    >(
        name: K,
        value?: V,
    ) {
        const timer = setTimeout(() => {
            pendingTimers.delete(timer);
            // The store may have been destroyed between scheduling and firing.
            if (destroyed) {
                return;
            }
            if (typeof name === "string") {
                set(name, value);
            }
            else if (typeof name === "object") {
                set(name);
            }
        }, 0);
        pendingTimers.add(timer);
    }

    function set<K extends KeyOf<PropMap>>(
        key: K,
        value: PropMap[K] | undefined,
    ): void;
    function set(key: Partial<PropMap>): void;
    function set<
        K extends (KeyOf<PropMap>) | Partial<PropMap>,
        V extends K extends (KeyOf<PropMap>) ? PropMap[K]
            : never,
    >(
        name: K,
        value?: V,
    ) {
        assertAlive();
        if (typeof name === "string") {
            if (computedKeys.has(name)) {
                throw new Error(
                    `Cannot set computed property "${name}"`,
                );
            }
            _set(name, value);
        }
        else if (typeof name === "object") {
            // Validate all keys before any write so a computed key in the patch
            // throws without partially applying the others.
            for (const k of Object.keys(name)) {
                if (computedKeys.has(k)) {
                    throw new Error(
                        `Cannot set computed property "${k}"`,
                    );
                }
            }
            const changedKeys: MapKey[] = [];
            const isIntercepting = control.isIntercepting();
            const hasEffectListener = control.get(EffectEventName)
                ?.hasListener();
            const shouldInterceptEffects = hasEffectListener && !isIntercepting;
            let controlError: Error | null = null;
            if (shouldInterceptEffects) {
                control.intercept(effectInterceptor);
                computedBatch = new Map();
            }
            let allChangedKeys: MapKey[] = [];
            try {
                // Phase 1: write every base value with effect emission deferred,
                // so computed values do not recompute against a half-updated
                // state mid-loop.
                if (shouldInterceptEffects) {
                    deferEffects = true;
                }
                Object.entries(name).forEach(([ k, v ]) => {
                    if (_set(k, v, false)) {
                        changedKeys.push(k);
                    }
                });
                // Phase 2: with all base values final, replay the effect once per
                // changed key. `computedBatch` skips a computed whose dependency
                // values are unchanged since its last recompute, while still
                // letting chained computeds re-settle when an upstream updates.
                if (shouldInterceptEffects) {
                    deferEffects = false;
                    changedKeys.forEach((k) => {
                        // Mirror _set's effect error contract: a throwing effect
                        // listener routes to the error event (and is swallowed if
                        // a handler exists) rather than aborting the whole set.
                        try {
                            control.trigger(EffectEventName, k, data.get(k));
                        }
                        catch (error) {
                            control.trigger(ErrorEventName, {
                                error: error instanceof Error
                                    ? error
                                    : new Error(String(error)),
                                args: [ k ],
                                type: "store-control",
                                name: k,
                            });
                            if (!control.get(ErrorEventName)?.hasListener()) {
                                throw error;
                            }
                        }
                    });
                }
                allChangedKeys = dedupe([
                    ...changedKeys,
                    ...effectKeys,
                ]);
            }
            finally {
                if (shouldInterceptEffects) {
                    effectKeys = [];
                    deferEffects = false;
                    computedBatch = null;
                    control.stopIntercepting();
                }
            }
            // Fire the outer change AFTER intercepting stops; otherwise the
            // effectInterceptor (active during the loop to fold computed/effect
            // writes into effectKeys) would swallow this trigger too.
            if (allChangedKeys.length > 0) {
                try {
                    control.trigger(ChangeEventName, allChangedKeys);
                }
                catch (error) {
                    controlError = error instanceof Error
                        ? error
                        : new Error(String(error));
                }
            }
            if (controlError) {
                control.trigger(ErrorEventName, {
                    error: controlError,
                    args: [ name ],
                    type: "store-control",
                });
                if (control.get(ErrorEventName)?.hasListener()) {
                    return;
                }
                throw controlError;
            }
        }
        else {
            throw new Error(`Invalid key: ${String(name)}`);
        }
    }

    const get = <
        K extends (KeyOf<PropMap>) | Array<KeyOf<PropMap>>,
    >(key: K) => {
        type V = K extends (KeyOf<PropMap>) ? PropMap[K]
            : K extends Array<KeyOf<PropMap>> ? {
                    [AK in K[number]]: PropMap[AK];
                }
            : never;
        assertAlive();
        if (typeof key === "string") {
            const value: unknown = data.get(key);
            return value as V;
        }
        else if (Array.isArray(key)) {
            // return object with given keys
            const result: Record<string, unknown> = {};
            for (const k of key) {
                result[k] = data.get(k);
            }
            return result as V;
        }
        else {
            throw new Error(`Invalid key: ${String(key)}`);
        }
    };

    const isEmpty = () => {
        if (data.size === 0) {
            return true;
        }
        return Array.from(data.values()).every((value) =>
            value === null || value === undefined
        );
    };

    const getData = () => {
        return Object.fromEntries(data.entries()) as PropMap;
    };

    let batching = false;

    const batch = (fn: () => void) => {
        if (batching) {
            throw new Error("Nested batch() calls are not supported");
        }
        batching = true;
        const allChangedKeys: MapKey[] = [];
        const log: [ MapKey, any, any ][] = [];
        const controlInterceptor = function(
            name: MapKey,
            [ changedKeys ]: MapKey[][],
        ) {
            if (name === ChangeEventName) {
                allChangedKeys.push(...changedKeys);
                return false;
            }
            return true;
        };
        const changeInterceptor = function(propName: MapKey, args: any[]) {
            log.push([ propName, args[0], args[1] ]);
            return false;
        };
        changes.intercept(changeInterceptor);
        control.intercept(controlInterceptor);
        let callbackError: unknown;
        let hasCallbackError = false;
        try {
            fn();
        }
        catch (error) {
            callbackError = error;
            hasCallbackError = true;
        }
        finally {
            control.stopIntercepting();
            changes.stopIntercepting();
            batching = false;
        }

        // Coalesce the log per key before replaying: a key written multiple
        // times in the batch (e.g. a computed recomputing once per base-key
        // write) must fire onChange once with its final value, not once per
        // intermediate value. Keep first-occurrence order, the pre-batch `prev`
        // from the first entry, and the final `value` from the last entry; drop
        // keys whose net value is unchanged from before the batch.
        const coalesced = new Map<MapKey, { value: any; prev: any }>();
        for (const [ propName, value, prev ] of log) {
            const existing = coalesced.get(propName);
            if (existing) {
                existing.value = value;
            }
            else {
                coalesced.set(propName, { value, prev });
            }
        }

        for (const [ propName, { value, prev } ] of coalesced) {
            if (value === prev) {
                continue;
            }
            const changeArgs = [
                value,
                prev,
            ] as unknown as ChangeEvents[typeof propName]["arguments"];
            try {
                changes.trigger(propName, ...changeArgs);
            }
            catch (error) {
                control.trigger(ErrorEventName, {
                    error: error instanceof Error
                        ? error
                        : new Error(String(error)),
                    args: changeArgs,
                    type: "store-change",
                    name: propName,
                });
                if (control.get(ErrorEventName)?.hasListener()) {
                    continue;
                }
                if (hasCallbackError) {
                    continue;
                }
                throw error;
            }
        }

        if (allChangedKeys.length > 0) {
            try {
                control.trigger(ChangeEventName, allChangedKeys);
            }
            catch (error) {
                control.trigger(ErrorEventName, {
                    error: error instanceof Error
                        ? error
                        : new Error(String(error)),
                    args: [ allChangedKeys ],
                    type: "store-control",
                });
                if (control.get(ErrorEventName)?.hasListener()) {
                    if (hasCallbackError) {
                        throw callbackError;
                    }
                    return;
                }
                if (hasCallbackError) {
                    throw callbackError;
                }
                throw error;
            }
        }

        if (hasCallbackError) {
            throw callbackError;
        }
    };

    const reset = () => {
        data.clear();
        control.trigger(ResetEventName);
    };

    // One-call teardown: destroy the underlying change/pipe/control buses and
    // drop all data. Post-destroy set/get throw rather than silently no-op.
    const destroy = () => {
        pendingTimers.forEach((timer) => clearTimeout(timer));
        pendingTimers.clear();
        changes.destroy();
        pipe.destroy();
        control.destroy();
        data.clear();
        computedKeys.clear();
        computingKeys.clear();
        effectKeys = [];
        destroyed = true;
    };

    const isDestroyed = () => destroyed;

    // Registers `key` as a derived value recomputed from `deps`. Built as sugar
    // over the `effect` control event: recompute writes via the internal `_set`
    // (triggerChange = true) so the change folds into the same outer `change`
    // batch via `effectKeys`. Computed keys flow transparently through
    // get/getData/onChange/useStoreState/useStoreSelector.
    //
    // Known limitation: recompute is registration-order, not topologically
    // sorted. Within one multi-key set a dependent in a chain may recompute
    // from a stale upstream first, but it re-settles to the final value once the
    // upstream computed updates (`computedBatch` keys on dep values, not a
    // one-shot flag). Registering the base before the dependent minimises the
    // transient intermediate emission.
    const computed = <
        K extends KeyOf<PropMap>,
        const D extends readonly KeyOf<PropMap>[],
    >(
        key: K,
        deps: D,
        fn: (...values: { [I in keyof D]: PropMap[D[I]] | undefined }) =>
            PropMap[K],
    ) => {
        const readDeps = () =>
            deps.map((d) => data.get(d)) as {
                [I in keyof D]: PropMap[D[I]] | undefined;
            };

        computedKeys.add(key);

        // Seed the initial value directly (no change emitted at setup time).
        data.set(key, fn(...readDeps()));

        control.addListener(EffectEventName, (changedName) => {
            if ((deps as readonly MapKey[]).indexOf(changedName) === -1) {
                return;
            }
            const depValues = readDeps();
            // Within a single multi-key set, skip the recompute only when this
            // computed's dependency values are unchanged since its last
            // recompute in the batch. That dedupes redundant dep changes while
            // still re-settling a chain when an upstream computed updates.
            if (computedBatch) {
                const lastDepValues = computedBatch.get(key);
                if (
                    lastDepValues
                    && arraysShallowEqual(lastDepValues, depValues)
                ) {
                    return;
                }
                computedBatch.set(key, depValues as unknown[]);
            }
            if (computingKeys.has(key)) {
                throw new Error(
                    `Cyclic computed dependency detected at "${key}"`,
                );
            }
            computingKeys.add(key);
            try {
                _set(key, fn(...depValues));
            }
            finally {
                computingKeys.delete(key);
            }
        });
    };

    const api = {
        set,
        get,
        getData,
        batch,
        asyncSet,
        computed,
        isEmpty,
        reset,
        destroy,
        isDestroyed,
        onChange: changes.addListener,
        removeOnChange: changes.removeListener,
        updateOnChangeOptions: changes.updateListenerOptions,
        control: control.addListener,
        removeControl: control.removeListener,
        pipe: pipe.addListener,
        removePipe: pipe.removeListener,
    } as const;
    return api as ApiType<Store, typeof api>;
}

export type BaseStoreDefinition = StoreDefinitionHelper<BasePropMap>;
export type BaseStore = ReturnType<typeof createStore<any>>;
