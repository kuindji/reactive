import { useCallback, useEffect, useRef } from "react";
import type { BaseEvent, ListenerOptions } from "../event.js";
import type { ErrorListenerSignature } from "../lib/types.js";

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

    useEffect(() => {
        event.addListener(genericHandler, options);
        return () => {
            event.removeListener(genericHandler, options?.context ?? null);
        };
    }, [event, genericHandler]);

    useEffect(() => {
        if (errorListener) {
            event.addErrorListener(errorListener);
            return () => {
                event.removeErrorListener(errorListener);
            };
        }
    }, [event, errorListener]);
}
