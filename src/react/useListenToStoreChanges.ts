import { useCallback, useEffect, useRef } from "react";
import type { ListenerOptions } from "../event";
import { KeyOf } from "../lib/types";
import type { BaseStore } from "../store";

export type { BaseStore, ListenerOptions };

export function useListenToStoreChanges<
    TStore extends BaseStore,
    TKey extends KeyOf<TStore["__type"]["propTypes"]>,
    TListener extends TStore["__type"]["changeEvents"][TKey],
>(
    store: TStore,
    key: TKey,
    listener: TListener,
    options?: ListenerOptions,
) {
    const listenerRef = useRef<TListener>(listener);
    const storeRef = useRef<TStore>(store);

    listenerRef.current = listener;

    const genericHandler = useCallback(
        (value: any, previousValue?: any) => {
            return listenerRef.current(value, previousValue);
        },
        [],
    );

    useEffect(
        () => {
            return () => {
                storeRef.current.removeOnChange(key, genericHandler);
            };
        },
        [],
    );

    useEffect(
        () => {
            storeRef.current.removeOnChange(key, genericHandler);
            storeRef.current = store;
            storeRef.current.onChange(key, genericHandler, options);
        },
        [ store ],
    );
}
