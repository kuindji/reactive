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
        () => store.get(key) as ValueType,
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
