import { useCallback, useRef, useSyncExternalStore } from "react";
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

    // Refs keep the subscribe/getSnapshot callbacks stable across renders even
    // when inline selector/equality/deps change identity each render.
    const selectorRef = useRef(selector);
    selectorRef.current = selector;
    const equalityRef = useRef(equalityFn);
    equalityRef.current = equalityFn;
    const depsRef = useRef(deps);
    depsRef.current = deps;

    const cacheRef = useRef<{ value: unknown; } | null>(null);

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

    const getSnapshot = useCallback(
        () => {
            const currentDeps = depsRef.current;
            const next = currentDeps
                ? selectorRef.current(
                    ...currentDeps.map((d) => store.get(d)),
                )
                : selectorRef.current(store.getData());

            const cache = cacheRef.current;
            if (cache && equalityRef.current(cache.value, next)) {
                return cache.value;
            }
            cacheRef.current = { value: next };
            return next;
        },
        [ store ],
    );

    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
