import { useCallback, useEffect, useRef } from "react";
import type { ListenerOptions } from "../event";
import type { BaseEventBus } from "../eventBus";
import type { ErrorListenerSignature, KeyOf } from "../lib/types";

export type { BaseEventBus, ErrorListenerSignature, ListenerOptions };

export function useListenToEventBus<
    TEventBus extends BaseEventBus,
    TKey extends KeyOf<TEventBus["__type"]["eventSignatures"]>,
    TListener extends TEventBus["__type"]["eventSignatures"][TKey],
>(
    eventBus: TEventBus,
    eventName: TKey,
    listener: TListener,
    options?: ListenerOptions,
    errorListener?: ErrorListenerSignature<any[]>,
) {
    const listenerRef = useRef<TListener>(listener);
    listenerRef.current = listener;

    const genericHandler = useCallback(
        (...args: Parameters<TListener>) => {
            return listenerRef.current?.(...args);
        },
        [],
    );

    // Main listener - cleanup pattern handles eventBus/eventName changes
    useEffect(() => {
        eventBus.addListener(eventName, genericHandler, options);
        return () => {
            eventBus.removeListener(eventName, genericHandler);
        };
    }, [eventBus, eventName, genericHandler]);

    // Error listener - cleanup pattern
    useEffect(() => {
        if (errorListener) {
            eventBus.addErrorListener(errorListener);
            return () => {
                eventBus.removeErrorListener(errorListener);
            };
        }
    }, [eventBus, errorListener]);
}
