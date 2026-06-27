import { useCallback, useSyncExternalStore } from "react";
import { KeyOf } from "../lib/types.js";
import { BaseStore } from "../store.js";

export function useStoreState<
    TStore extends BaseStore,
    TKey extends KeyOf<TStore["__type"]["propTypes"]>,
>(store: TStore, key: TKey) {
    type ValueType = TStore["__type"]["propTypes"][TKey];
    type Setter = (
        previousValue?: ValueType,
    ) => ValueType;

    const subscribe = useCallback(
        (onStoreChange: () => void) => {
            const listener = () => {
                onStoreChange();
            };
            store.onChange(key, listener);
            return () => {
                store.removeOnChange(key, listener);
            };
        },
        [ store, key ],
    );

    const getSnapshot = useCallback(
        // getSnapshot can run for a still-mounted component after the store is
        // destroyed (e.g. a provider torn down first), and must not throw out of
        // render. On a destroyed store read via getData() (returns {} without
        // asserting) instead of get() (which throws). Mirrors useStoreSelector.
        () =>
            (store.isDestroyed()
                ? (store.getData() as Record<string, unknown>)[key]
                : store.get(key)) as ValueType,
        [ store, key ],
    );

    const value = useSyncExternalStore(
        subscribe,
        getSnapshot,
        getSnapshot,
    );

    const setter = useCallback(
        (value: ValueType | Setter) => {
            if (typeof value === "function") {
                // The cast is required by tsc (the typeof-narrowed `value` is
                // `Setter | (ValueType & Function)`, not all callable), even
                // though no-unnecessary-type-assertion disagrees on this TS
                // version.
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
                store.set(key, (value as Setter)(store.get(key)));
            }
            else {
                store.set(key, value);
            }
        },
        [ store, key ],
    );

    return [ value, setter ] as const;
}
