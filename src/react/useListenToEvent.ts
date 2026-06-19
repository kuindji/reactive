import { useCallback, useEffect, useRef } from "react";
import type { BaseEvent, ListenerOptions } from "../event.js";
import type { ErrorListenerSignature } from "../lib/types.js";
import { useReconciledListener } from "./useReconciledListener.js";

export type { BaseEvent, ErrorListenerSignature, ListenerOptions };

export function useListenToEvent<
    TEvent extends BaseEvent,
    TListenerSignature extends TEvent["__type"]["signature"],
    TErrorListenerSignature extends TEvent["__type"]["errorListenerSignature"],
>(
    event: TEvent,
    listener: TListenerSignature,
    options?: ListenerOptions,
    errorListener?: TErrorListenerSignature,
) {
    const listenerRef = useRef<TListenerSignature>(listener);
    listenerRef.current = listener;

    const genericHandler = useCallback(
        (...args: Parameters<TListenerSignature>) => {
            return listenerRef.current(...args);
        },
        [],
    );

    useReconciledListener({
        keyDeps: [ event ],
        options,
        subscribe: (opts) => event.addListener(genericHandler, opts ?? undefined),
        unsubscribe: (ctx) => event.removeListener(genericHandler, ctx),
        update: (ctx, opts) =>
            event.updateListenerOptions(genericHandler, ctx, opts ?? undefined),
    });

    useEffect(() => {
        if (errorListener) {
            event.addErrorListener(errorListener);
            return () => {
                event.removeErrorListener(errorListener);
            };
        }
    }, [event, errorListener]);
}
