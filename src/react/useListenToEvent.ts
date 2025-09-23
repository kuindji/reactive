import { useCallback, useEffect, useRef } from "react";
import type { BaseEvent, ListenerOptions } from "../event";
import type { ErrorListenerSignature } from "../lib/types";

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
    const eventRef = useRef<TEvent>(event);
    const errorListenerRef = useRef<TErrorListenerSignature>(errorListener);

    listenerRef.current = listener;

    const genericHandler = useCallback(
        (...args: Parameters<TListenerSignature>) => {
            return listenerRef.current(...args);
        },
        [],
    );

    useEffect(
        () => {
            return () => {
                eventRef.current.removeListener(genericHandler);
            };
        },
        [],
    );

    useEffect(
        () => {
            eventRef.current.removeListener(genericHandler);
            eventRef.current = event;
            eventRef.current.addListener(genericHandler, options);
        },
        [ event ],
    );

    useEffect(
        () => {
            if (errorListenerRef.current !== errorListener) {
                if (errorListenerRef.current) {
                    eventRef.current.removeErrorListener(
                        errorListenerRef.current,
                    );
                }
                errorListenerRef.current = errorListener;
                if (errorListener) {
                    eventRef.current.addErrorListener(errorListener);
                }
            }
        },
        [ errorListener ],
    );
}
