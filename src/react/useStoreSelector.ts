import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useSyncExternalStore,
} from "react";
import type { KeyOf, MapKey } from "../lib/types.js";
import type { BaseStore } from "../store.js";
import { ChangeEventName } from "../store.js";

export type EqualityFn<T> = (a: T, b: T) => boolean;

// Shallow per-entry equality for two state objects (enumerable own keys
// compared with Object.is). Used to gate selector re-execution in the
// no-deps form, whose input is rebuilt fresh by getData() on every call.
function shallowEqualObject(
    a: Record<string, unknown>,
    b: Record<string, unknown>,
): boolean {
    if (a === b) {
        return true;
    }
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) {
        return false;
    }
    for (const key of aKeys) {
        if (
            !Object.prototype.hasOwnProperty.call(b, key)
            || !Object.is(a[key], b[key])
        ) {
            return false;
        }
    }
    return true;
}

/**
 * Subscribes to a derived slice of a store with custom equality. Selector
 * re-execution is gated on the raw input (dep values, or a shallow compare of
 * the full state), so a selector that builds a fresh object each call returns a
 * stable cached reference while its input is unchanged — safe even without an
 * equality fn (an un-gated fresh reference on every getSnapshot call would loop
 * forever). The optional equality fn additionally bails React re-renders when a
 * recompute produces an equal-but-fresh result.
 *
 * Two forms:
 *   useStoreSelector(store, (s) => `${s.first} ${s.last}`, shallowEqual?)
 *   useStoreSelector(store, ["first", "last"], (first, last) => …, eqFn?)
 *
 * The deps-keyed form recomputes only when the change batch touches its keys.
 *
 * Prefer the deps-keyed form for narrow reads. The selector form (no deps)
 * subscribes to every store change and rebuilds the whole state via getData()
 * on each one, re-running the selector even for unrelated writes (the equality
 * fn still bails React re-renders, but the recompute itself is not filtered).
 * The deps-keyed form both filters the subscription to its keys and avoids
 * materializing the full state, so reach for it when selecting a few slices of
 * a large or frequently-written store.
 *
 * Concurrent-safe: the selection is memoized in a render-phase `useMemo` (an
 * abandoned concurrent render discards it rather than leaking it into the
 * committed tree) and the committed value is recorded in an effect, not during
 * render. This mirrors React's own `useSyncExternalStoreWithSelector`.
 */
export function useStoreSelector<TStore extends BaseStore, R>(
    store: TStore,
    selector: (state: TStore["__type"]["propTypes"]) => R,
    equalityFn?: EqualityFn<R>,
): R;
export function useStoreSelector<
    TStore extends BaseStore,
    const D extends readonly KeyOf<TStore["__type"]["propTypes"]>[],
    R,
>(
    store: TStore,
    deps: D,
    selector: (
        ...values: { [I in keyof D]: TStore["__type"]["propTypes"][D[I]] }
    ) => R,
    equalityFn?: EqualityFn<R>,
): R;
export function useStoreSelector(
    store: BaseStore,
    arg2:
        | ((state: Record<string, unknown>) => unknown)
        | readonly MapKey[],
    arg3?: ((...values: unknown[]) => unknown) | EqualityFn<unknown>,
    arg4?: EqualityFn<unknown>,
): unknown {
    const deps = Array.isArray(arg2) ? (arg2 as readonly MapKey[]) : null;
    const selector = (deps ? arg3 : arg2) as (...args: unknown[]) => unknown;
    const equalityFn = (deps ? arg4 : arg3 as EqualityFn<unknown>)
        ?? Object.is;

    // Committed selection cache. Written ONLY in an effect (commit phase) so an
    // abandoned concurrent render cannot leak its selection into the committed
    // tree (which a render-phase write to this cache would).
    const instRef = useRef<{ hasValue: boolean; value: unknown; } | null>(null);
    if (instRef.current === null) {
        instRef.current = { hasValue: false, value: null };
    }
    const inst = instRef.current;

    // Latest deps for the subscribe filter. Updated in a layout effect (commit
    // phase), not during render, and read only inside the change listener (which
    // fires after commit), so the subscription always filters on committed deps.
    const depsRef = useRef(deps);
    useLayoutEffect(() => {
        depsRef.current = deps;
    });

    // The memoized selection getter. Built during render, but the useMemo result
    // is part of the fiber's memoized state: an abandoned concurrent render
    // discards it, so no closure leaks. Rebuilt only when the store, selector,
    // equality, or deps identity changes. The committed `inst.value` is read
    // (never written) here, so a re-render with an equal result bails out to the
    // committed reference.
    const getSelection = useMemo(
        () => {
            let hasMemo = false;
            let memoizedInput: unknown[] = [];
            let memoized: unknown;
            // Read the raw selector input (dep values, or the full state). On a
            // destroyed store, read via getData() (which returns {} without
            // asserting) instead of store.get() (which throws): getSnapshot can
            // run for a still-mounted component after the store is destroyed
            // (e.g. a provider torn down first), and must not throw out of
            // render. Returns the input as an arg array so it can be both
            // shallow-compared and spread into the selector.
            const readInput = (): unknown[] => {
                if (deps) {
                    if (store.isDestroyed()) {
                        const snapshot = store.getData() as Record<
                            MapKey,
                            unknown
                        >;
                        return deps.map((d) => snapshot[d]);
                    }
                    return deps.map((d) => store.get(d));
                }
                return [ store.getData() ];
            };
            // Compare two raw inputs. The deps form holds dep values, compared
            // by identity (the store replaces values on change, so identity
            // tracks change). The selector form holds a single full-state
            // object rebuilt fresh by getData() on every call, so it must be
            // shallow-compared by entries rather than reference.
            const inputsEqual = (a: unknown[], b: unknown[]): boolean => {
                if (deps) {
                    if (a.length !== b.length) {
                        return false;
                    }
                    for (let i = 0; i < a.length; i++) {
                        if (!Object.is(a[i], b[i])) {
                            return false;
                        }
                    }
                    return true;
                }
                return shallowEqualObject(
                    a[0] as Record<string, unknown>,
                    b[0] as Record<string, unknown>,
                );
            };
            return () => {
                const input = readInput();
                if (!hasMemo) {
                    hasMemo = true;
                    memoizedInput = input;
                    const next = selector(...input);
                    if (inst.hasValue && equalityFn(inst.value, next)) {
                        memoized = inst.value;
                        return inst.value;
                    }
                    memoized = next;
                    return next;
                }
                // Gate selector re-execution on the raw input. getSnapshot must
                // return a cached reference that only changes when the store
                // changes; re-running a fresh-object selector on every call (and
                // relying solely on equalityFn) would return a new reference
                // each call under the default Object.is and loop forever. When
                // the input is unchanged we return the cached selection without
                // re-running the selector — mirroring React's own
                // useSyncExternalStoreWithSelector, which gates on snapshot
                // identity (here the store's reads are not stable references, so
                // we shallow-compare the input instead).
                if (inputsEqual(memoizedInput, input)) {
                    return memoized;
                }
                memoizedInput = input;
                const next = selector(...input);
                if (equalityFn(memoized, next)) {
                    return memoized;
                }
                memoized = next;
                return next;
            };
        },
        [ store, selector, equalityFn, deps, inst ],
    );

    const subscribe = useCallback(
        (onStoreChange: () => void) => {
            const listener = (names: MapKey[]) => {
                const currentDeps = depsRef.current;
                if (
                    currentDeps
                    && !names.some((n) => currentDeps.indexOf(n) !== -1)
                ) {
                    return;
                }
                onStoreChange();
            };
            store.control(ChangeEventName, listener);
            return () => {
                store.removeControl(ChangeEventName, listener);
            };
        },
        [ store ],
    );

    const value = useSyncExternalStore(subscribe, getSelection, getSelection);

    useEffect(() => {
        inst.hasValue = true;
        inst.value = value;
    }, [ value, inst ]);

    return value;
}
