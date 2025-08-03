import { useCallback, useEffect, useRef } from "react";
import type { BaseEventBus } from "../../src/eventBus";
import type { ErrorListenerSignature, KeyOf } from "../../src/lib/types";
import type { ListenerOptions } from "../event";

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
    const eventBusRef = useRef<TEventBus>(eventBus);
    const errorListenerRef = useRef<ErrorListenerSignature<any[]>>(
        errorListener,
    );

    listenerRef.current = listener;

    const genericHandler = useCallback(
        (...args: Parameters<TListener>) => {
            return listenerRef.current(...args);
        },
        [],
    );

    useEffect(
        () => {
            return () => {
                eventBusRef.current.removeListener(eventName, genericHandler);
                if (errorListenerRef.current) {
                    eventBusRef.current.removeErrorListener(
                        errorListenerRef.current,
                    );
                }
            };
        },
        [],
    );

    useEffect(
        () => {
            eventBusRef.current.removeListener(eventName, genericHandler);
            eventBusRef.current = eventBus;
            eventBusRef.current.addListener(eventName, genericHandler, options);
        },
        [ eventBus ],
    );

    useEffect(
        () => {
            if (errorListenerRef.current !== errorListener) {
                if (errorListenerRef.current) {
                    eventBusRef.current.removeErrorListener(
                        errorListenerRef.current,
                    );
                }
                errorListenerRef.current = errorListener;
                if (errorListener) {
                    eventBusRef.current.addErrorListener(errorListener);
                }
            }
        },
        [ errorListener ],
    );
}
