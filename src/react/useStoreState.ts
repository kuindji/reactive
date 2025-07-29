import { useCallback, useEffect, useRef, useState } from "react";
import { MapKey } from "../lib/types";
import { BaseStore } from "../store";

export function useStoreState<
    TStore extends BaseStore,
    TKey extends MapKey & keyof TStore["__type"]["propTypes"],
>(store: TStore, key: TKey) {
    type ValueType = TStore["__type"]["propTypes"][TKey];
    type Setter = (
        previousValue?: ValueType | undefined,
    ) => ValueType;
    const [ value, setValue ] = useState(store.get(key));
    const storeRef = useRef<TStore>(store);
    const keyRef = useRef<TKey>(key);

    const onChange = useCallback(
        (value: ValueType) => {
            setValue(value);
        },
        [],
    );

    const setter = useCallback(
        (value: ValueType | Setter) => {
            if (typeof value === "function") {
                storeRef.current.set(
                    keyRef.current,
                    // @ts-expect-error
                    value(storeRef.current.get(keyRef.current)),
                );
            }
            else {
                storeRef.current.set(keyRef.current, value);
            }
        },
        [],
    );

    useEffect(
        () => {
            return () => {
                // @ts-expect-error
                storeRef.current.onChange(keyRef.current, onChange);
            };
        },
        [],
    );

    useEffect(
        () => {
            // @ts-expect-error
            storeRef.current.removeOnChange(keyRef.current, onChange);
            storeRef.current = store;
            keyRef.current = key;
            // @ts-expect-error
            storeRef.current.onChange(keyRef.current, onChange);
        },
        [ store, key ],
    );

    return [ value, setter ] as const;
}
