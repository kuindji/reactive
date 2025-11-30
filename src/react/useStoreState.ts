import { useCallback, useEffect, useRef, useState } from "react";
import { KeyOf } from "../lib/types";
import { BaseStore } from "../store";

export function useStoreState<
    TStore extends BaseStore,
    TKey extends KeyOf<TStore["__type"]["propTypes"]>,
>(store: TStore, key: TKey) {
    type ValueType = TStore["__type"]["propTypes"][TKey];
    type Setter = (
        previousValue?: ValueType,
    ) => ValueType;
    const [ value, setValue ] = useState<ValueType>(store.get(key));
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
                    (value as Setter)(storeRef.current.get(keyRef.current)),
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
                storeRef.current.removeOnChange(keyRef.current, onChange);
            };
        },
        [],
    );

    useEffect(
        () => {
            storeRef.current.removeOnChange(keyRef.current, onChange);
            storeRef.current = store;
            keyRef.current = key;
            storeRef.current.onChange(keyRef.current, onChange);
        },
        [ store, key ],
    );

    return [ value, setter ] as const;
}
