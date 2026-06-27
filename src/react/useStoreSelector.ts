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

/**
 * Subscribes to a derived slice of a store with custom equality. Returns the
 * cached reference while the equality fn reports the result unchanged, so a
 * selector that builds a fresh object each call still lets React bail out of
 * re-renders (returning a fresh reference every time would loop forever).
 *
 * Two forms:
 *   useStoreSelector(store, (s) => `${s.first} ${s.last}`, shallowEqual?)
 *   useStoreSelector(store, ["first", "last"], (first, last) => …, eqFn?)
 *
 * The deps-keyed form recomputes only when the change batch touches its keys.
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
            let memoized: unknown;
            return () => {
                // On a destroyed store, read deps via getData() (which returns
                // {} without asserting) instead of store.get() (which throws):
                // getSnapshot can run for a still-mounted component after the
                // store is destroyed (e.g. a provider torn down first), and must
                // not throw out of render. This mirrors the selector form, which
                // already reads through getData().
                let next: unknown;
                if (deps) {
                    if (store.isDestroyed()) {
                        const snapshot = store.getData() as Record<
                            MapKey,
                            unknown
                        >;
                        next = selector(...deps.map((d) => snapshot[d]));
                    }
                    else {
                        next = selector(...deps.map((d) => store.get(d)));
                    }
                }
                else {
                    next = selector(store.getData());
                }
                if (!hasMemo) {
                    hasMemo = true;
                    if (inst.hasValue && equalityFn(inst.value, next)) {
                        memoized = inst.value;
                        return inst.value;
                    }
                    memoized = next;
                    return next;
                }
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
