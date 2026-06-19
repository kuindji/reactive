import { useCallback, useRef } from "react";
import type { ListenerOptions } from "../event.js";
import { KeyOf } from "../lib/types.js";
import type { BaseStore } from "../store.js";
import { useReconciledListener } from "./useReconciledListener.js";

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
    listenerRef.current = listener;

    const genericHandler = useCallback(
        (value: any, previousValue?: any) => {
            return listenerRef.current(value, previousValue);
        },
        [],
    );

    useReconciledListener({
        keyDeps: [ store, key ],
        options,
        subscribe: (opts) =>
            store.onChange(key, genericHandler, opts ?? undefined),
        unsubscribe: (ctx) => store.removeOnChange(key, genericHandler, ctx),
        update: (ctx, opts) =>
            store.updateOnChangeOptions(
                key,
                genericHandler,
                ctx,
                opts ?? undefined,
            ),
    });
}
